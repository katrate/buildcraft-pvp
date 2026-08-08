import { WebSocket } from 'ws';
import {
  DISCONNECT_GRACE_MS,
  MATCH_COUNTDOWN_MS,
  TURN_TIMEOUT_MS,
} from '../../shared/src/constants';
import {
  applyAction,
  chooseBotAction,
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
  disconnectTimers: Map<string, NodeJS.Timeout>;
  botLoopTimer: NodeJS.Timeout | null;
  /** Server-authoritative countdown before the arena starts (null once started). */
  countdownEndAt: number | null;
  countdownTimer: NodeJS.Timeout | null;
  over: boolean;
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

  constructor(
    private botThinkMs = 1100,
    private matchCountdownMs = MATCH_COUNTDOWN_MS,
  ) {}

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
      disconnectTimers: new Map(),
      botLoopTimer: null,
      countdownEndAt: Date.now() + this.matchCountdownMs,
      countdownTimer: null,
      over: false,
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
    for (const player of m.players.values()) {
      this.send(player.ws, {
        type: 'match_start',
        match: m.state,
        yourCombatantIds: [player.combatantId],
        yourTeam: player.teamId,
      });
    }
    this.scheduleBotLoop(matchId);
    this.resetTurnTimer(matchId);
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
    if (m.state.currentCombatantId !== combatant.id) {
      this.send(player.ws, { type: 'error', message: 'It is not your turn.' });
      return false;
    }
    applyAction(m.state, action);
    this.broadcast(matchId);
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
    const dt = m.disconnectTimers.get(playerId);
    if (dt) {
      clearTimeout(dt);
      m.disconnectTimers.delete(playerId);
    }
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
    this.send(player.ws, { type: 'match_start', match: m.state, yourCombatantIds: [player.combatantId], yourTeam: player.teamId });
    return true;
  }

  handleDisconnect(playerId: string, ws: WebSocket): void {
    const matchId = this.matchIdByPlayer.get(playerId);
    if (!matchId) return;
    const m = this.matches.get(matchId);
    if (!m || m.over) return;
    const player = m.players.get(playerId);
    if (!player || player.ws !== ws) return; // stale socket
    player.ws = null;
    player.disconnectedAt = Date.now();
    const timer = setTimeout(() => {
      const mm = this.matches.get(matchId);
      const pp = mm?.players.get(playerId);
      if (!mm || mm.over || !pp || pp.ws !== null) return;
      const combatant = getCombatant(mm.state, player.combatantId);
      if (combatant) {
        combatant.isBot = true;
        combatant.isPlayerControlled = false;
      }
      this.scheduleBotLoop(matchId);
    }, DISCONNECT_GRACE_MS);
    m.disconnectTimers.set(playerId, timer);
  }

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

  private resetTurnTimer(matchId: string): void {
    const m = this.matches.get(matchId);
    if (!m || m.over) return;
    if (m.turnTimer) clearTimeout(m.turnTimer);
    m.turnTimer = setTimeout(() => {
      const mm = this.matches.get(matchId);
      if (!mm || mm.over || mm.state.phase === 'MATCH_END') return;
      const current = getCurrentCombatant(mm.state);
      if (!current || current.isBot) return;
      applyAction(mm.state, { type: 'END_TURN' });
      this.broadcast(matchId);
      this.resetTurnTimer(matchId);
      this.scheduleBotLoop(matchId);
    }, TURN_TIMEOUT_MS);
  }

  private broadcast(matchId: string): void {
    const m = this.matches.get(matchId);
    if (!m) return;
    if (m.state.phase === 'MATCH_END') {
      // Always send the final state first so clients see the killing blow
      this.sendToAll(m, { type: 'match_state', match: m.state });
      this.finishMatch(matchId);
      return;
    }
    this.sendToAll(m, { type: 'match_state', match: m.state });
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
    for (const [, dt] of m.disconnectTimers) clearTimeout(dt);

    const survived = roundsSurvived(m.state);

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
      }
      this.send(player.ws, {
        type: 'match_end',
        matchId,
        winnerTeam: m.state.winnerTeam ?? -1,
        result,
        rewards,
        teamSize: m.teamSize,
        rankDelta,
      });
      this.matchIdByPlayer.delete(player.playerId);
    }
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

