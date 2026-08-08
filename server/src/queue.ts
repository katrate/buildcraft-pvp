import type { WebSocket } from 'ws';
import type { Preset, PvpMode, RankedUpgrades, ServerMessage } from '../../shared/src/types';
import { MATCHMAKING_BOT_FILL_WAIT_MS, RANKED_WINDOW_WIDEN_AFTER_MS } from '../../shared/src/constants';
import { RATING_BANDS, tierForRating } from '../../shared/src/rating';
import { MatchManager } from './matches';

interface QueuedPlayer {
  playerId: string;
  name: string;
  ws: WebSocket;
  preset: Preset;
  initiativeUpgrade: number;
  rankedUpgrades: Partial<RankedUpgrades>;
  rating: number;
  joinedAt: number;
  /** Party members all share the party id and can NEVER be split across teams. */
  partyId?: string;
  /** Ranked window anchor: the party creator's tier (parties only). */
  anchorTier?: number;
}

export type QueueKey = `${PvpMode}:${1 | 2 | 5}`;

const QUEUE_TICK_MS = 1000;

function queueKey(mode: PvpMode, teamSize: 1 | 2 | 5): QueueKey {
  return `${mode}:${teamSize}`;
}

// ------------------------------------------------------------
// Pure decision helper (unit-testable).
// ------------------------------------------------------------
export type QueueDecision = 'full' | 'bot-fill' | 'wait';

export function shouldStartMatch(
  queued: number,
  teamSize: 1 | 2 | 5,
  idleMs: number,
  waitMs: number,
  botFill = true,
): QueueDecision {
  if (queued >= teamSize * 2) return 'full'; // enough real players for both teams
  if (botFill && queued >= 1 && idleMs >= waitMs) return 'bot-fill'; // gave up waiting -> fill with bots
  return 'wait'; // keep looking for real players
}

// ------------------------------------------------------------
// Queue units.
//
// A party is a UNIT: all its members are queued together and must end up
// on the SAME team. Solos are units of size 1. Units are indivisible.
// ------------------------------------------------------------

export interface QueueUnit {
  id: string; // playerId for solos, partyId for parties
  size: number;
  tier: number; // ranked window anchor (party creator's tier for parties)
  players: QueuedPlayer[];
}

export function buildUnits(q: QueuedPlayer[]): QueueUnit[] {
  const byGroup = new Map<string, QueuedPlayer[]>();
  for (const p of q) {
    const key = p.partyId ?? p.playerId;
    const arr = byGroup.get(key);
    if (arr) arr.push(p);
    else byGroup.set(key, [p]);
  }
  const seen = new Set<string>();
  const units: QueueUnit[] = [];
  for (const p of q) {
    const key = p.partyId ?? p.playerId;
    if (seen.has(key)) continue;
    seen.add(key);
    const players = byGroup.get(key)!;
    const first = players[0];
    units.push({
      id: key,
      size: players.length,
      tier: first.anchorTier ?? tierForRating(first.rating),
      players,
    });
  }
  return units;
}

// ------------------------------------------------------------
// Team partitioner (backtracking, unit-whole).
//
// `exact` requires BOTH teams to be completely full (ranked has no bots).
// Parties (`mustPick`) may never be skipped when they are required.
// Returns team A/B as indices into `units`.
// ------------------------------------------------------------
export interface PartUnit {
  size: number;
  mustPick: boolean;
  index: number;
}

export function partitionTeams(
  units: PartUnit[],
  teamSize: number,
): { a: number[]; b: number[] } | null {
  const n = units.length;
  const a: number[] = [];
  const b: number[] = [];
  let aSum = 0;
  let bSum = 0;

  // Ranked has no bots, so BOTH teams must end up exactly full. Try A, then
  // B, then skip (parties may never be skipped). Returns the FIRST exact
  // assignment found — units earlier in the queue get priority.
  const dfs = (i: number): { a: number[]; b: number[] } | null => {
    if (i === n) {
      if (aSum !== teamSize || bSum !== teamSize) return null;
      return { a: [...a], b: [...b] };
    }
    const u = units[i];
    if (aSum + u.size <= teamSize) {
      a.push(i);
      aSum += u.size;
      const r = dfs(i + 1);
      if (r) return r;
      a.pop();
      aSum -= u.size;
    }
    if (bSum + u.size <= teamSize) {
      b.push(i);
      bSum += u.size;
      const r = dfs(i + 1);
      if (r) return r;
      b.pop();
      bSum -= u.size;
    }
    if (!u.mustPick) {
      const r = dfs(i + 1);
      if (r) return r;
    }
    return null;
  };

  const res = dfs(0);
  if (!res) return null;
  return { a: res.a.map((k) => units[k].index), b: res.b.map((k) => units[k].index) };
}

// ------------------------------------------------------------
// Ranked rank-window cap, party-aware.
//
// A ranked player may only fight players of the SAME rank band or one
// band away — `maxSpread = 1` (widens to ±2 after a long wait). Party
// units anchor on the CREATOR's tier: the window must contain at least
// one party, and party members are already validated (by app.ts) to be
// within ±1 band of the creator, so the whole party always fits the
// window. The enemy team is therefore matched around the creator's rank.
//
// Returns the indices of picked units (plus team split) or null.
// ------------------------------------------------------------
export interface RankedUnitInput {
  id: string;
  tier: number;
  size: number;
  party: boolean;
}

export function findRankedPartyGroup(
  inputs: RankedUnitInput[],
  teamSize: 1 | 2 | 5,
  maxSpread = 1,
): { unitIndices: number[]; teamA: number[]; teamB: number[] } | null {
  const hasParties = inputs.some((u) => u.party);
  for (let t = 0; t + maxSpread < RATING_BANDS.length; t += 1) {
    const inWindow = inputs
      .map((u, i) => ({ u, i }))
      .filter(({ u }) => u.tier >= t && u.tier <= t + maxSpread);
    // If any party is queued, the window must include one (a party can't
    // slip into a match that ignores it).
    if (hasParties && !inWindow.some(({ u }) => u.party)) continue;
    const parts = inWindow.map(({ u, i }) => ({
      size: u.size,
      mustPick: u.party, // first try: every party in the window plays
      index: i,
    }));
    let res = partitionTeams(parts, teamSize);
    if (!res) {
      // Fallback: if the parties can't all play together, form the match
      // from whatever units fit (some party may keep waiting).
      res = partitionTeams(parts.map((p) => ({ ...p, mustPick: false })), teamSize);
    }
    if (res) {
      // partitionTeams already remaps positions to the original unit indices.
      return { unitIndices: [...res.a, ...res.b], teamA: res.a, teamB: res.b };
    }
  }
  return null;
}

// Backward-compatible solo wrapper (all units of size 1).
export function findRankedGroup(
  tiers: number[],
  teamSize: 1 | 2 | 5,
  maxSpread = 1,
): number[] | null {
  const inputs: RankedUnitInput[] = tiers.map((tier, i) => ({ id: `s${i}`, tier, size: 1, party: false }));
  const res = findRankedPartyGroup(inputs, teamSize, maxSpread);
  return res ? res.unitIndices : null;
}

// ------------------------------------------------------------
// Unranked team assignment (real players first, bots fill the rest).
//
// Parties get priority so they always play together, and — importantly —
// solo real players fill the PARTY's empty slots before any real player is
// placed on the opposing team. Bots only fill whatever is still missing
// inside matches.createMatch.
// ------------------------------------------------------------
function assignUnrankedTeams(q: QueuedPlayer[], teamSize: 1 | 2 | 5): { players: QueuedPlayer[]; teams: number[][] } {
  const units = buildUnits(q);
  // Parties (size > 1) first so they never get separated.
  const ordered = [...units].sort((x, y) => (x.size > 1 ? (y.size > 1 ? 0 : -1) : y.size > 1 ? 1 : 0));
  const a: QueuedPlayer[] = [];
  const b: QueuedPlayer[] = [];
  let aSum = 0;
  let bSum = 0;
  for (const unit of ordered) {
    // Team A is packed first, so a party's team is completed with real
    // players (the party's "empty slots") before team B gets any.
    if (aSum + unit.size <= teamSize) {
      a.push(...unit.players);
      aSum += unit.size;
    } else if (bSum + unit.size <= teamSize) {
      b.push(...unit.players);
      bSum += unit.size;
    }
    // unit that fits nowhere stays queued
  }
  // players = [...teamA, ...teamB] — bots fill the rest inside matches.createMatch
  return { players: [...a, ...b], teams: [a.map((_, i) => i), b.map((_, i) => a.length + i)] };
}

export class MatchmakingQueue {
  private queues = new Map<QueueKey, QueuedPlayer[]>();
  private lastJoinAt = new Map<QueueKey, number>();
  private ticker: NodeJS.Timeout | null = null;

  constructor(
    private matches: MatchManager,
    private botFillWaitMs = MATCHMAKING_BOT_FILL_WAIT_MS,
    private rankWidenAfterMs = RANKED_WINDOW_WIDEN_AFTER_MS,
  ) {
    // Seed every mode×size queue. ranked:1 / ranked:2 are unreachable through
    // join_queue (ranked is 5v5 only) but are still iterated by leave/leaveParty,
    // so they are seeded empty rather than omitted.
    for (const mode of ['unranked', 'ranked'] as const) {
      for (const ts of [1, 2, 5] as const) {
        this.queues.set(queueKey(mode, ts), []);
        this.lastJoinAt.set(queueKey(mode, ts), 0);
      }
    }
    this.ticker = setInterval(() => this.tick(), QUEUE_TICK_MS);
  }

  join(
    mode: PvpMode,
    teamSize: 1 | 2 | 5,
    entry: Omit<QueuedPlayer, 'joinedAt'>,
  ): void {
    const key = queueKey(mode, teamSize);
    const q = this.queues.get(key)!;
    this.leave(entry.playerId); // never double-queue
    q.push({ ...entry, joinedAt: Date.now() });
    // A new real player extends the search window: keep looking for opponents.
    this.lastJoinAt.set(key, Date.now());
    console.log(`[queue] ${entry.name} joined ${mode} ${teamSize}v${teamSize}${entry.partyId ? ` (party ${entry.partyId})` : ''} (${q.length} waiting)`);
    this.broadcastQueueUpdate(mode, teamSize);
  }

  leave(playerId: string): void {
    for (const [key, q] of this.queues) {
      const idx = q.findIndex((p) => p.playerId === playerId);
      if (idx >= 0) {
        q.splice(idx, 1);
        const [mode, tsStr] = key.split(':');
        this.broadcastQueueUpdate(mode as PvpMode, Number(tsStr) as 1 | 2 | 5);
      }
    }
  }

  /** Pull every member of a party out of every queue (the unit broke). */
  leaveParty(partyId: string): void {
    for (const [key, q] of this.queues) {
      const before = q.length;
      const removed: QueuedPlayer[] = [];
      let i = q.length;
      while (i-- > 0) {
        if (q[i].partyId === partyId) removed.push(q.splice(i, 1)[0]);
      }
      if (q.length !== before) {
        const mode = key.split(':')[0] as PvpMode;
        const ts = Number(key.split(':')[1]) as 1 | 2 | 5;
        this.broadcastQueueUpdate(mode, ts);
        // Tell the removed party members they are OUT of the queue, so their
        // UIs stop showing "searching…" even when other players remain queued
        // (a queue_update with a remaining count would keep them stuck).
        const msg: ServerMessage = { type: 'queue_left', reason: 'Your party left the queue.' };
        for (const p of removed) {
          if (p.ws.readyState === p.ws.OPEN) p.ws.send(JSON.stringify(msg));
        }
      }
    }
  }

  size(mode: PvpMode, teamSize: 1 | 2 | 5): number {
    return this.queues.get(queueKey(mode, teamSize))!.length;
  }

  /** Whether this player is currently sitting in any queue. */
  isQueued(playerId: string): boolean {
    for (const q of this.queues.values()) {
      if (q.some((p) => p.playerId === playerId)) return true;
    }
    return false;
  }

  /** When the longest-waiting player in a queue joined (ms epoch), or undefined when empty. */
  oldestSince(mode: PvpMode, teamSize: 1 | 2 | 5): number | undefined {
    const q = this.queues.get(queueKey(mode, teamSize))!;
    return q.length > 0 ? Math.min(...q.map((p) => p.joinedAt)) : undefined;
  }

  private tick(): void {
    for (const mode of ['unranked', 'ranked'] as const) {
      const botFill = mode === 'unranked';
      for (const teamSize of [1, 2, 5] as const) {
        const key = queueKey(mode, teamSize);
        const q = this.queues.get(key)!;
        if (q.length === 0) continue;
        if (mode === 'ranked') {
          if (teamSize !== 5) continue; // ranked is 5v5 only — no 1v1/2v2
          this.tryStartRanked(key, q, teamSize);
          continue;
        }
        const idleMs = Date.now() - (this.lastJoinAt.get(key) ?? 0);
        if (shouldStartMatch(q.length, teamSize, idleMs, this.botFillWaitMs, botFill) === 'wait') continue;
        const { players, teams } = assignUnrankedTeams(q, teamSize);
        if (players.length === 0) continue;
        for (const p of players) this.removePlayer(q, p);
        this.broadcastQueueUpdate(mode, teamSize);
        this.matches.createMatch(players, teamSize, mode, teams);
      }
    }
  }

  // Ranked: start a match only from players within one rank band of each
  // other (see findRankedPartyGroup). Once the longest-waiting player has
  // waited `rankWidenAfterMs`, the window widens to ±2 bands. Incompatible
  // players simply keep waiting. Ranked is 5v5 only — never bot-fills.
  private tryStartRanked(key: QueueKey, q: QueuedPlayer[], teamSize: 1 | 2 | 5): void {
    const oldestJoinedAt = Math.min(...q.map((p) => p.joinedAt));
    const oldestWaitMs = Date.now() - oldestJoinedAt;
    const widened = oldestWaitMs >= this.rankWidenAfterMs;
    const maxSpread = widened ? 2 : 1;
    const units = buildUnits(q);
    const inputs: RankedUnitInput[] = units.map((u) => ({
      id: u.id,
      tier: u.tier,
      size: u.size,
      party: u.size > 1,
    }));
    const res = findRankedPartyGroup(inputs, teamSize, maxSpread);
    if (!res) return; // keep searching — no compatible rank window yet
    const chosenUnits = res.unitIndices.map((i) => units[i]);
    const teamAUnits = res.teamA.map((i) => units[i]);
    const teamBUnits = res.teamB.map((i) => units[i]);
    const players: QueuedPlayer[] = [...teamAUnits.flatMap((u) => u.players), ...teamBUnits.flatMap((u) => u.players)];
    for (const u of chosenUnits) {
      for (const p of u.players) this.removePlayer(q, p);
    }
    const [mode, tsStr] = key.split(':') as [PvpMode, string];
    const teamSizeKey = Number(tsStr) as 1 | 2 | 5;
    const lenA = teamAUnits.reduce((n, u) => n + u.players.length, 0);
    const teamIndices: number[][] = [
      Array.from({ length: lenA }, (_, i) => i),
      Array.from({ length: players.length - lenA }, (_, i) => lenA + i),
    ];
    console.log(`[queue] ranked ${teamSizeKey}v${teamSizeKey} matched ${players.length} players (window ±${maxSpread} band${maxSpread === 1 ? '' : 's'})`);
    this.broadcastQueueUpdate(mode, teamSizeKey);
    const entries = players.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      ws: p.ws,
      preset: p.preset,
      initiativeUpgrade: p.initiativeUpgrade,
      rankedUpgrades: p.rankedUpgrades,
      rating: p.rating,
    }));
    this.matches.createMatch(entries, teamSizeKey, 'ranked', teamIndices);
  }

  private removePlayer(q: QueuedPlayer[], p: QueuedPlayer): void {
    const idx = q.indexOf(p);
    if (idx >= 0) q.splice(idx, 1);
  }

  private broadcastQueueUpdate(mode: PvpMode, teamSize: 1 | 2 | 5): void {
    const q = this.queues.get(queueKey(mode, teamSize))!;
    const msg: ServerMessage = {
      type: 'queue_update',
      queued: q.length,
      teamSize,
      mode,
      minPlayers: teamSize,
      queuedSince: q.length > 0 ? Math.min(...q.map((p) => p.joinedAt)) : undefined,
    };
    for (const p of q) {
      if (p.ws.readyState === p.ws.OPEN) p.ws.send(JSON.stringify(msg));
    }
  }

  shutdown(): void {
    if (this.ticker) clearInterval(this.ticker);
  }
}
