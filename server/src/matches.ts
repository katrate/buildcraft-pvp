import { WebSocket } from 'ws';
import { recordMatchResult, type MatchRecordParticipant } from './db';
import {
  AFK_QUEUE_BAN_MS,
  AFK_RR_PENALTY,
  AFK_SKIP_MS,
  MATCH_COUNTDOWN_MS,
  MAX_CONSECUTIVE_SKIPS,
  TURN_TIMEOUT_MS,
} from '../../shared/src/constants';
import {
  applyAction,
  chooseBotAction,
  collectCombatStats,
  computePvpBuild,
  createMatch,
  getCombatant,
  getCurrentCombatant,
  getMatchResultForPlayer,
  roundsSurvived,
  computeRewards,
  ratingDelta,
  getBotPreset,
} from '../../shared/src/index';
import type {
  CombatBuild,
  CustomNorm,
  MatchMode,
  MatchRewards,
  MatchState,
  PlayerAction,
  Preset,
  PvpMode,
  RankedUpgrades,
  ServerMessage,
} from '../../shared/src/types';

interface MatchPlayer {
  playerId: string;
  name: string;
  ws: WebSocket | null;
  teamId: number;
  combatantId: string;
  rating: number;
  disconnectedAt: number | null;
  resultsSent: boolean;
}

interface ActiveMatch {
  state: MatchState;
  players: Map<string, MatchPlayer>;
  teamSize: 1 | 2 | 5;
  /** Real player counts per team — for custom matches these can be uneven (e.g. 2v5). */
  teamA: number;
  teamB: number;
  turnTimer: NodeJS.Timeout | null;
  botLoopTimer: NodeJS.Timeout | null;
  /** Server-authoritative countdown before the arena starts (null once started). */
  countdownEndAt: number | null;
  countdownTimer: NodeJS.Timeout | null;
  over: boolean;
  /** Surrender votes per team (playerId sets). Unanimous among real players on a team. */
  surrenderVotes: Map<number, Set<string>>;
  /** Consecutive skipped turns per playerId — reaching MAX_CONSECUTIVE_SKIPS declares AFK. */
  skipCount: Map<string, number>;
  /** Muted playerIds: their turns are auto-skipped until they send afk_return. */
  afk: Set<string>;
  /** ms epoch when the current player's turn times out (null when no timer is running). */
  turnDeadlineAt: number | null;
  /** Transient skip/AFK notice — shown in exactly one broadcast, then cleared. */
  notice: { combatantId: string; text: string } | null;
}

export interface PlayerEntry {
  playerId: string;
  name: string;
  ws: WebSocket;
  preset: Preset;
  initiativeUpgrade: number;
  rankedUpgrades: Partial<RankedUpgrades>;
  rating: number;
}

// Build a PvP combatant per mode:
//  - unranked: normalized base stats + (non-normalized) initiative upgrade
//  - ranked:   full stats + ranked upgrades, bounded by rank ceilings (enforced client-side)
//  - custom:   normalized to the unranked reference + the lobby's chosen rank
//    budget (customNorm) — everyone in the same lobby is equal
//  - practice: never reaches the server (client-side matches)
export function buildPvpBuild(
  preset: Preset,
  mode: MatchMode,
  extras: { initiativeUpgrade?: number; rankedUpgrades?: Partial<RankedUpgrades>; customNorm?: CustomNorm },
): CombatBuild {
  return computePvpBuild(preset, mode, extras);
}

export class MatchManager {
  private matches = new Map<string, ActiveMatch>();
  private matchIdByPlayer = new Map<string, string>();
  /** playerId -> ms epoch until which they are banned from the queue (AFK in ranked). */
  private queueBans = new Map<string, number>();

  constructor(
    private botThinkMs = 1100,
    private matchCountdownMs = MATCH_COUNTDOWN_MS,
  ) {}

  /** Remaining ban time (ms) for a player, or 0 when not banned. */
  getQueueBanLeftMs(playerId: string): number {
    const until = this.queueBans.get(playerId) ?? 0;
    return Math.max(0, until - Date.now());
  }

  // `teams` = indices into `players` per team (party groups arrive pre-assigned
  // from the queue so party members always share a team). When omitted, real
  // players are split randomly and bots fill the rest (e.g. 3 players in 2v2
  // -> 2 vs 1 + bots). Custom matches pass explicit teams and disable bot fill,
  // so uneven splits (2v5) are allowed and every slot is a real player.
  createMatch(
    players: PlayerEntry[],
    teamSize: 1 | 2 | 5,
    mode: PvpMode | 'custom' = 'unranked',
    teams?: number[][],
    opts?: { fillBots?: boolean; customNorm?: CustomNorm },
  ): ActiveMatch {
    const matchId = `match_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    let teamA: PlayerEntry[];
    let teamB: PlayerEntry[];
    if (teams) {
      teamA = (teams[0] ?? []).map((i) => players[i]).filter(Boolean);
      teamB = (teams[1] ?? []).map((i) => players[i]).filter(Boolean);
    } else {
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const half = Math.ceil(shuffled.length / 2);
      teamA = shuffled.slice(0, half);
      teamB = shuffled.slice(half);
    }

    const realCount = players.length;
    const modeLabel = teams ? `${teamA.length}v${teamB.length}` : `${teamSize}v${teamSize}`;
    console.log(`[match] ${matchId} formed — ${mode} ${modeLabel}, ${realCount} real player(s)`);

    const makeCombatant = (
      entry: PlayerEntry | { playerId: null; name: string; preset: Preset; ws: null; initiativeUpgrade: number; rankedUpgrades: Partial<RankedUpgrades>; rating: number },
    ) => ({
      id: entry.playerId ? `p_${entry.playerId}` : `bot_${entry.name}_${Math.random().toString(36).slice(2, 7)}`,
      name: entry.name,
      playerId: entry.playerId,
      isBot: entry.playerId === null,
      build: buildPvpBuild(entry.preset, mode, {
        initiativeUpgrade: entry.initiativeUpgrade,
        rankedUpgrades: entry.rankedUpgrades,
        customNorm: opts?.customNorm,
      }),
    });

    const fillBots = opts?.fillBots !== false;
    const teamAInput = teamA.map(makeCombatant);
    while (fillBots && teamAInput.length < teamSize) {
      const bot = getBotPreset(teamAInput.length + teamB.length);
      teamAInput.push(makeCombatant({ playerId: null, name: bot.name, preset: bot.preset, ws: null, initiativeUpgrade: 0, rankedUpgrades: {}, rating: 1000 }));
    }
    const teamBInput = teamB.map(makeCombatant);
    while (fillBots && teamBInput.length < teamSize) {
      const bot = getBotPreset(teamAInput.length + teamBInput.length);
      teamBInput.push(makeCombatant({ playerId: null, name: bot.name, preset: bot.preset, ws: null, initiativeUpgrade: 0, rankedUpgrades: {}, rating: 1000 }));
    }

    const state = createMatch({
      id: matchId,
      mode,
      teams: [
        { teamId: 0, combatants: teamAInput },
        { teamId: 1, combatants: teamBInput },
      ],
    });

    const botsAdded = teamAInput.length + teamBInput.length - players.length;
    console.log(`[match] ${matchId} started — ${teamAInput.length}v${teamBInput.length} + ${botsAdded} bot(s)`);

    const active: ActiveMatch = {
      state,
      players: new Map(),
      teamSize,
      teamA: teamAInput.length,
      teamB: teamBInput.length,
      turnTimer: null,
      botLoopTimer: null,
      countdownEndAt: Date.now() + this.matchCountdownMs,
      countdownTimer: null,
      over: false,
      surrenderVotes: new Map(),
      skipCount: new Map(),
      afk: new Set(),
      turnDeadlineAt: null,
      notice: null,
    };

    const allEntries = [...teamA, ...teamB];
    for (const entry of allEntries) {
      const isTeamA = teamA.includes(entry);
      const idx = isTeamA ? teamA.indexOf(entry) : teamB.indexOf(entry);
      const combatant = (isTeamA ? teamAInput : teamBInput)[idx];
      active.players.set(entry.playerId, {
        playerId: entry.playerId,
        name: entry.name,
        ws: entry.ws,
        teamId: isTeamA ? 0 : 1,
        combatantId: combatant.id,
        rating: entry.rating,
        disconnectedAt: null,
        resultsSent: false,
      });
      this.matchIdByPlayer.set(entry.playerId, matchId);
    }

    this.matches.set(matchId, active);
    // Announce the match, then start the arena after the countdown.
    for (const entry of allEntries) {
      const player = active.players.get(entry.playerId)!;
      this.send(entry.ws, {
        type: 'match_found',
        matchId,
        mode,
        teamSize,
        countdownMs: this.matchCountdownMs,
        teamA: teamAInput.length,
        teamB: teamBInput.length,
      });
    }
    if (this.matchCountdownMs <= 0) {
      this.startMatch(matchId);
    } else {
      active.countdownTimer = setTimeout(() => this.startMatch(matchId), this.matchCountdownMs);
    }
    return active;
  }

  /** Kick the arena off: send the match state and start the turn/bot clocks. */
  private startMatch(matchId: string): void {
    const m = this.matches.get(matchId);
    if (!m || m.over) return;
    if (m.countdownTimer) {
      clearTimeout(m.countdownTimer);
      m.countdownTimer = null;
    }
    m.countdownEndAt = null;
    this.scheduleBotLoop(matchId);
    this.resetTurnTimer(matchId);
    const meta = this.meta(m);
    for (const player of m.players.values()) {
      this.send(player.ws, {
        type: 'match_start',
        match: m.state,
        yourCombatantIds: [player.combatantId],
        yourTeam: player.teamId,
        ...meta,
      });
    }
  }

  onAction(matchId: string, playerId: string, action: PlayerAction): boolean {
    const m = this.matches.get(matchId);
    if (!m || m.over) return false;
    // Actions are not accepted during the pre-match countdown.
    if (m.countdownEndAt !== null) return false;
    const player = m.players.get(playerId);
    if (!player) return false;
    const combatant = getCombatant(m.state, player.combatantId);
    if (!combatant || combatant.isBot || combatant.playerId !== playerId) return false;
    if (m.afk.has(playerId)) {
      this.send(player.ws, { type: 'error', message: 'You are AFK — click back in to play again.' });
      return false;
    }
    if (m.state.currentCombatantId !== combatant.id) {
      this.send(player.ws, { type: 'error', message: 'It is not your turn.' });
      return false;
    }
    applyAction(m.state, action);
    // Acting resets the consecutive-skip counter (skips must be in a row).
    m.skipCount.delete(playerId);
    this.broadcast(matchId);
    if (m.over) return true; // match ended inside the broadcast
    this.resetTurnTimer(matchId);
    this.scheduleBotLoop(matchId);
    return true;
  }

  reconnect(playerId: string, ws: WebSocket): boolean {
    const matchId = this.matchIdByPlayer.get(playerId);
    if (!matchId) return false;
    const m = this.matches.get(matchId);
    if (!m || m.over) return false;
    const player = m.players.get(playerId);
    if (!player) return false;
    player.ws = ws;
    player.disconnectedAt = null;
    const combatant = getCombatant(m.state, player.combatantId);
    if (combatant) {
      combatant.isBot = false;
      combatant.isPlayerControlled = true;
    }
    if (m.countdownEndAt !== null) {
      // The match is still in its countdown — resend the countdown so the
      // reconnecting player sees the loading screen with the remaining time.
      const remaining = Math.max(0, m.countdownEndAt - Date.now());
      this.send(player.ws, {
        type: 'match_found',
        matchId,
        mode: m.state.mode as 'unranked' | 'ranked' | 'custom',
        teamSize: m.teamSize,
        countdownMs: remaining,
        teamA: m.teamA,
        teamB: m.teamB,
      });
      return true;
    }
    const meta = this.meta(m);
    this.send(player.ws, {
      type: 'match_start',
      match: m.state,
      yourCombatantIds: [player.combatantId],
      yourTeam: player.teamId,
      ...meta,
    });
    // The clock keeps running for the current turn (a disconnected player's
    // turns simply skip, and a reconnected player picks up where they left).
    return true;
  }

  // A closed tab never abandons the match: the state stays in memory and the
  // turn clock keeps running, so the player's turns get skipped and they go
  // AFK naturally (1v1 loss / team mute). Returning (rejoin) picks up exactly
  // where they left. The match is NOT bot-ified — an idle combatant is the
  // intended penalty for leaving mid-game.
  handleDisconnect(playerId: string, ws: WebSocket): void {
    const matchId = this.matchIdByPlayer.get(playerId);
    if (!matchId) return;
    const m = this.matches.get(matchId);
    if (!m || m.over) return;
    const player = m.players.get(playerId);
    if (!player || player.ws !== ws) return; // stale socket
    player.ws = null;
    player.disconnectedAt = Date.now();
  }

  // ------------------------------------------------------------
  // Surrender & AFK
  // ------------------------------------------------------------

  /** Vote to surrender. Ends the match immediately in 1v1; in team matches
   *  every REAL player on the team must vote before the surrender goes through
   *  (bots never vote). Returns true if the vote was recorded. */
  surrender(playerId: string): boolean {
    const matchId = this.matchIdByPlayer.get(playerId);
    if (!matchId) return false;
    const m = this.matches.get(matchId);
    if (!m || m.over || m.countdownEndAt !== null) return false;
    const player = m.players.get(playerId);
    if (!player) return false;
    const votes = m.surrenderVotes.get(player.teamId) ?? new Set<string>();
    votes.add(playerId);
    m.surrenderVotes.set(player.teamId, votes);
    const required = [...m.players.values()].filter((p) => p.teamId === player.teamId).length;
    if (votes.size >= required) {
      const winnerTeam = player.teamId === 0 ? 1 : 0;
      this.endMatch(matchId, winnerTeam, `${player.name} surrendered — the match is over.`);
    } else {
      m.notice = {
        combatantId: player.combatantId,
        text: `${player.name} wants to surrender — ${votes.size}/${required} voted.`,
      };
      this.broadcast(matchId);
    }
    return true;
  }

  /** A muted player clicked back in — stop skipping their turns. */
  afkReturn(playerId: string): boolean {
    const matchId = this.matchIdByPlayer.get(playerId);
    if (!matchId) return false;
    const m = this.matches.get(matchId);
    if (!m || m.over) return false;
    if (!m.afk.delete(playerId)) return false; // not muted — nothing to undo
    m.skipCount.delete(playerId);
    const player = m.players.get(playerId);
    if (player) {
      m.notice = { combatantId: player.combatantId, text: `${player.name} is back from AFK.` };
    }
    this.broadcast(matchId);
    this.resetTurnTimer(matchId); // if it's their turn now, restart the clock
    return true;
  }

  // ------------------------------------------------------------
  // Bot driving & timers
  // ------------------------------------------------------------

  // ------------------------------------------------------------
  // Bot driving & timers
  // ------------------------------------------------------------

  private scheduleBotLoop(matchId: string): void {
    const m = this.matches.get(matchId);
    if (!m || m.over) return;
    const current = getCurrentCombatant(m.state);
    if (!current) return;
    if (current.isBot) {
      if (m.botLoopTimer) clearTimeout(m.botLoopTimer);
      m.botLoopTimer = setTimeout(() => this.botStep(matchId), this.botThinkMs);
    }
  }

  private botStep(matchId: string): void {
    const m = this.matches.get(matchId);
    if (!m || m.over) return;
    const current = getCurrentCombatant(m.state);
    if (!current || !current.isBot) return;
    if (m.state.phase === 'MATCH_END') {
      this.finishMatch(matchId);
      return;
    }
    const action = chooseBotAction(m.state, current.id);
    applyAction(m.state, action);
    this.broadcast(matchId);
    if (m.over) return; // match finished inside broadcast
    this.resetTurnTimer(matchId);
    m.botLoopTimer = setTimeout(() => this.botStep(matchId), this.botThinkMs);
  }

  // (Re)arm the turn clock. Bots are driven by the bot loop instead; the clock
  // only ever runs for real players. Muted players are skipped on a quick
  // cadence so the match flows while they are away.
  private resetTurnTimer(matchId: string): void {
    const m = this.matches.get(matchId);
    if (!m || m.over) return;
    if (m.turnTimer) {
      clearTimeout(m.turnTimer);
      m.turnTimer = null;
    }
    if (m.state.phase === 'MATCH_END') {
      m.turnDeadlineAt = null;
      return;
    }
    const current = getCurrentCombatant(m.state);
    if (!current || current.isBot) {
      m.turnDeadlineAt = null;
      return;
    }
    const muted = !!current.playerId && m.afk.has(current.playerId);
    const wait = muted ? AFK_SKIP_MS : TURN_TIMEOUT_MS;
    m.turnDeadlineAt = Date.now() + wait;
    m.turnTimer = setTimeout(() => this.turnTimeout(matchId), wait);
  }

  private turnTimeout(matchId: string): void {
    const m = this.matches.get(matchId);
    if (!m || m.over) return;
    m.turnTimer = null;
    if (m.state.phase === 'MATCH_END') {
      m.turnDeadlineAt = null;
      return;
    }
    const current = getCurrentCombatant(m.state);
    if (!current || current.isBot) return;
    const playerId = current.playerId;
    if (playerId && !m.afk.has(playerId)) {
      // Muted players skip silently every turn — the persistent afk map (banner
      // + tile badge) already communicates their state, so per-skip notices
      // would just spam broadcasts every AFK_SKIP_MS.
      const skips = (m.skipCount.get(playerId) ?? 0) + 1;
      m.skipCount.set(playerId, skips);
      if (skips >= MAX_CONSECUTIVE_SKIPS) {
        this.declareAfk(matchId, playerId);
        if (m.over) return; // 1v1 ended the match
      } else {
        m.notice = {
          combatantId: current.id,
          text: `${current.name} didn't act in time — turn skipped (${skips}/${MAX_CONSECUTIVE_SKIPS}).`,
        };
      }
    }
    applyAction(m.state, { type: 'END_TURN' });
    this.broadcast(matchId);
    if (m.over) return;
    this.resetTurnTimer(matchId);
    this.scheduleBotLoop(matchId);
  }

  // A player hit MAX_CONSECUTIVE_SKIPS: 1v1 loses the match on the spot;
  // team matches mute them (all turns auto-skip) until they click back in.
  private declareAfk(matchId: string, playerId: string): void {
    const m = this.matches.get(matchId);
    if (!m || m.over) return;
    m.afk.add(playerId);
    const player = m.players.get(playerId);
    const combatant = player ? getCombatant(m.state, player.combatantId) : null;
    if (m.teamSize === 1) {
      const loserTeam = player?.teamId ?? 0;
      const winnerTeam = loserTeam === 0 ? 1 : 0;
      this.endMatch(matchId, winnerTeam, `${combatant?.name ?? 'A player'} went AFK — the match is lost.`);
      return;
    }
    // Team match: mute. The notice rides on the turnTimeout broadcast that
    // follows immediately (no separate broadcast — avoids double frames).
    m.notice = {
      combatantId: player?.combatantId ?? playerId,
      text: `${combatant?.name ?? playerId} is AFK — turns are skipped until they return.`,
    };
  }

  // Force a match result (surrender / AFK loss). Mirrors the engine's win
  // condition: phase MATCH_END + winnerTeam, then the normal finish flow.
  private endMatch(matchId: string, winnerTeam: number, text?: string): void {
    const m = this.matches.get(matchId);
    if (!m || m.over) return;
    m.state.phase = 'MATCH_END';
    m.state.winnerTeam = winnerTeam;
    m.state.currentCombatantId = null;
    this.broadcast(matchId); // sends the final state, then finishes the match
  }

  // Server-driven meta attached to every match_start / match_state: the turn
  // deadline, surrender vote tallies, muted combatants and any transient
  // notice. The notice is one-shot — read and cleared in the same call.
  private meta(m: ActiveMatch): {
    turnDeadline: number | null;
    surrenderVotes: Record<number, number>;
    afk: Record<string, boolean>;
    notice: { combatantId: string; text: string } | null;
  } {
    const surrenderVotes: Record<number, number> = {};
    for (const [teamId, votes] of m.surrenderVotes) surrenderVotes[teamId] = votes.size;
    const afk: Record<string, boolean> = {};
    for (const playerId of m.afk) {
      const p = m.players.get(playerId);
      if (p) afk[p.combatantId] = true;
    }
    const notice = m.notice;
    m.notice = null;
    return { turnDeadline: m.turnDeadlineAt, surrenderVotes, afk, notice };
  }

  private broadcast(matchId: string): void {
    const m = this.matches.get(matchId);
    if (!m) return;
    const meta = this.meta(m);
    if (m.state.phase === 'MATCH_END') {
      // Always send the final state first so clients see the killing blow
      this.sendToAll(m, { type: 'match_state', match: m.state, ...meta });
      this.finishMatch(matchId);
      return;
    }
    this.sendToAll(m, { type: 'match_state', match: m.state, ...meta });
  }

  // ------------------------------------------------------------
  // End of match
  // ------------------------------------------------------------

  private finishMatch(matchId: string): void {
    const m = this.matches.get(matchId);
    if (!m || m.over) return;
    m.over = true;
    if (m.turnTimer) clearTimeout(m.turnTimer);
    if (m.botLoopTimer) clearTimeout(m.botLoopTimer);
    if (m.countdownTimer) clearTimeout(m.countdownTimer);

    const survived = roundsSurvived(m.state);
    const stats = collectCombatStats(m.state);
    const participants: MatchRecordParticipant[] = [];

    // Ranked rating deltas (ELO): each team is treated as one rating (its
    // players' average), so 1v1 uses direct ratings and 2v2 uses team averages.
    const teamAvgRating = new Map<number, number>();
    if (m.state.mode === 'ranked') {
      for (const teamId of [0, 1]) {
        const players = [...m.players.values()].filter((p) => p.teamId === teamId);
        if (players.length === 0) continue;
        const avg = players.reduce((sum, p) => sum + p.rating, 0) / players.length;
        teamAvgRating.set(teamId, Math.round(avg));
      }
    }

    for (const player of m.players.values()) {
      if (player.resultsSent) continue;
      player.resultsSent = true;
      const result = getMatchResultForPlayer(m.state, player.playerId) ?? 'draw';
      const combatant = getCombatant(m.state, player.combatantId);
      const rewards: MatchRewards = computeRewards(result, m.state.mode, {
        roundsSurvived: survived,
        kills: combatant?.kills ?? 0,
      });
      let rankDelta: number | undefined;
      if (m.state.mode === 'ranked' && teamAvgRating.size === 2) {
        const oppTeam = player.teamId === 0 ? 1 : 0;
        const my = teamAvgRating.get(player.teamId)!;
        const opp = teamAvgRating.get(oppTeam)!;
        rankDelta = ratingDelta(my, opp, result);
        // A player who went AFK in ranked (and never returned) eats a flat RR
        // penalty on top of the result, and is banned from queueing for 1h.
        if (m.afk.has(player.playerId)) {
          rankDelta += AFK_RR_PENALTY;
          this.queueBans.set(player.playerId, Date.now() + AFK_QUEUE_BAN_MS);
          console.log(`[match] ${player.name} AFK in ranked — RR ${rankDelta}, queue ban 1h`);
        }
      }
      this.send(player.ws, {
        type: 'match_end',
        matchId,
        winnerTeam: m.state.winnerTeam ?? -1,
        result,
        rewards,
        mode: m.state.mode,
        yourTeam: player.teamId,
        teamSize: m.teamSize,
        rankDelta,
        stats,
      });
      participants.push({
        playerId: player.playerId,
        team: player.teamId,
        result,
        kills: combatant?.kills ?? 0,
        coins: rewards.coins,
        xp: rewards.xp,
        rankDelta: rankDelta ?? null,
      });
      this.matchIdByPlayer.delete(player.playerId);
    }
    // Server-side ledger (Supabase service role; no-op when unconfigured).
    void recordMatchResult(m.state.mode, m.teamSize, m.state.winnerTeam ?? -1, participants);
    this.matches.delete(matchId);
  }

  private sendToAll(m: ActiveMatch, msg: ServerMessage): void {
    for (const player of m.players.values()) this.send(player.ws, msg);
  }

  private send(ws: WebSocket | null, msg: ServerMessage): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  getMatchIdByPlayer(playerId: string): string | undefined {
    return this.matchIdByPlayer.get(playerId);
  }

  matchCount(): number {
    return this.matches.size;
  }
}

