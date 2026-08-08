import {
  MAX_ROUNDS,
  ULTIMATE_CHARGE_MAX,
  ULTIMATE_CHARGE_PER_KILL,
  ULTIMATE_CHARGE_PER_ROUND,
} from '../constants';
import { statMultiplier } from '../game-data/effects';
import { EFFECT_META } from '../game-data/effects';
import type {
  CombatBuild,
  Combatant,
  LogEntry,
  MatchMode,
  MatchState,
  PlayerAction,
  PowerDefinition,
  TargetRule,
} from '../types';
import { applyEffect, isStunned, tickDoTs, tickDurations, tickRegen } from './effects';

// ------------------------------------------------------------
// Combatant construction
// ------------------------------------------------------------

export interface CombatantInput {
  id: string;
  name: string;
  playerId: string | null;
  isBot: boolean;
  build: CombatBuild;
}

export interface TeamInput {
  teamId: number;
  combatants: CombatantInput[];
}

export interface MatchInput {
  id: string;
  mode: MatchMode;
  teams: TeamInput[];
}

// Per-match uses for a power, including gear bonus uses.
export function maxUsesFor(power: PowerDefinition, build: CombatBuild): number {
  return (power.uses ?? 0) + build.bonusAbilityUses;
}

export function makeCombatant(input: CombatantInput): Combatant {
  const s = input.build.stats;
  const usesLeft: Record<string, number> = {};
  for (const p of input.build.actives) {
    usesLeft[p.id] = maxUsesFor(p, input.build);
  }
  return {
    id: input.id,
    playerId: input.playerId,
    name: input.name,
    teamId: 0, // assigned in createMatch
    isBot: input.isBot,
    isPlayerControlled: !input.isBot && input.playerId !== null,
    maxHp: s.maxHp,
    hp: s.maxHp,
    attack: s.attack,
    defense: s.defense,
    initiative: s.initiative,
    alive: true,
    kills: 0,
    usesLeft,
    effects: [],
    ultimate: input.build.ultimate ? { id: input.build.ultimate.id, charge: 0 } : null,
    build: input.build,
  };
}

// ------------------------------------------------------------
// Queries
// ------------------------------------------------------------

export function getCombatant(state: MatchState, id: string): Combatant | undefined {
  return state.combatants[id];
}

export function getCurrentCombatant(state: MatchState): Combatant | null {
  const id = state.currentCombatantId;
  return id ? state.combatants[id] ?? null : null;
}

export function getAliveOfTeam(state: MatchState, teamId: number): Combatant[] {
  return Object.values(state.combatants).filter((c) => c.alive && c.teamId === teamId);
}

export function aliveEnemies(state: MatchState, combatantId: string): Combatant[] {
  const self = state.combatants[combatantId];
  if (!self) return [];
  return Object.values(state.combatants).filter((c) => c.alive && c.teamId !== self.teamId);
}

export function aliveAllies(state: MatchState, combatantId: string): Combatant[] {
  const self = state.combatants[combatantId];
  if (!self) return [];
  return Object.values(state.combatants).filter((c) => c.alive && c.teamId === self.teamId);
}

export function effectiveAttack(c: Combatant): number {
  return c.attack * statMultiplier(c.effects, 'attack');
}

export function effectiveDefense(c: Combatant): number {
  return c.defense * statMultiplier(c.effects, 'defense');
}

export function effectiveInitiative(c: Combatant): number {
  return c.initiative * statMultiplier(c.effects, 'initiative');
}

// ------------------------------------------------------------
// Logging
// ------------------------------------------------------------

function log(state: MatchState, text: string): void {
  state.logSeq += 1;
  state.log.push({ round: state.round, text, seq: state.logSeq });
  if (state.log.length > 80) state.log.splice(0, state.log.length - 80);
}

// ------------------------------------------------------------
// Damage
// ------------------------------------------------------------

export function computeDamage(attacker: Combatant, defender: Combatant, power: { baseDamage?: number; flatDamage?: number }): number {
  const atk = effectiveAttack(attacker) * (power.baseDamage ?? 1) + (power.flatDamage ?? 0);
  const mitigation = effectiveDefense(defender) * 0.5;
  return Math.max(1, Math.round(atk - mitigation));
}

// A kill grants the killer +1 ultimate charge (capped) and +1 kill credit
// (used by the reward calculation).
function creditKill(state: MatchState, killerId: string): void {
  const killer = state.combatants[killerId];
  if (!killer) return;
  killer.kills += 1;
  if (!killer.ultimate) return;
  const before = killer.ultimate.charge;
  killer.ultimate.charge = Math.min(ULTIMATE_CHARGE_MAX, killer.ultimate.charge + ULTIMATE_CHARGE_PER_KILL);
  if (killer.ultimate.charge > before) {
    log(state, `${killer.name} scores a kill — ultimate charge ${killer.ultimate.charge}/${ULTIMATE_CHARGE_MAX}!`);
  }
}

function markDead(state: MatchState, c: Combatant, killerId?: string): void {
  if (!c.alive) return;
  c.alive = false;
  log(state, `${c.name} is eliminated!`);
  if (killerId && killerId !== c.id) creditKill(state, killerId);
}

function dealDamageTo(state: MatchState, target: Combatant, attacker: Combatant, dmg: number, source: string): number {
  if (dmg <= 0 || !target.alive) return 0;
  let remaining = dmg;
  for (const e of target.effects) {
    if (e.kind === 'shield' && e.amount > 0 && remaining > 0) {
      const absorbed = Math.min(e.amount, remaining);
      e.amount -= absorbed;
      remaining -= absorbed;
    }
  }
  target.effects = target.effects.filter((e) => e.kind !== 'shield' || e.amount > 0);
  const dealt = remaining;
  target.hp = Math.max(0, target.hp - dealt);
  if (dealt < dmg) log(state, `${source} broke through ${target.name}'s shield (${dmg - dealt} absorbed).`);
  log(state, `${target.name} takes ${dealt} damage (${source}).`);
  // Lethal blow
  if (target.hp <= 0) {
    markDead(state, target, attacker.id);
  }
  // Retaliation (only the living hit back)
  if (dealt > 0 && attacker.alive && target.alive) {
    let retal = 0;
    for (const e of target.effects) {
      if (e.kind === 'counter' || e.kind === 'thorns') retal += e.amount;
    }
    if (retal > 0) {
      attacker.hp = Math.max(0, attacker.hp - retal);
      log(state, `${target.name} retaliates for ${retal} damage!`);
      if (attacker.hp <= 0) markDead(state, attacker, target.id);
    }
  }
  return dealt;
}

// ------------------------------------------------------------
// Target resolution
// ------------------------------------------------------------

function resolveTargets(state: MatchState, actor: Combatant, rule: TargetRule, targetId?: string): Combatant[] {
  switch (rule) {
    case 'enemy': {
      const t = targetId ? state.combatants[targetId] : undefined;
      return t && t.alive && t.teamId !== actor.teamId ? [t] : [];
    }
    case 'ally': {
      const t = targetId ? state.combatants[targetId] : undefined;
      return t && t.alive && t.teamId === actor.teamId ? [t] : [];
    }
    case 'self':
      return [actor];
    case 'all-enemies':
      return Object.values(state.combatants).filter((c) => c.alive && c.teamId !== actor.teamId);
    case 'all-allies':
      return Object.values(state.combatants).filter((c) => c.alive && c.teamId === actor.teamId);
    case 'none':
      return [];
  }
}

// ------------------------------------------------------------
// Win condition
// ------------------------------------------------------------

function checkWin(state: MatchState): MatchState {
  // Time-limit safety valve: sustained-heal stalemates must still terminate.
  // When the round cap is exceeded, the team with more remaining HP wins.
  if (state.round > MAX_ROUNDS) {
    const teamFrac = new Map<number, number>();
    for (const c of Object.values(state.combatants)) {
      teamFrac.set(c.teamId, (teamFrac.get(c.teamId) ?? 0) + (c.alive ? c.hp / c.maxHp : 0));
    }
    let bestTeam = -1;
    let bestFrac = -1;
    let draw = false;
    for (const [teamId, frac] of teamFrac) {
      if (frac > bestFrac + 1e-6) {
        bestFrac = frac;
        bestTeam = teamId;
        draw = false;
      } else if (Math.abs(frac - bestFrac) <= 1e-6) {
        draw = true;
      }
    }
    state.winnerTeam = draw ? -1 : bestTeam;
    state.phase = 'MATCH_END';
    state.currentCombatantId = null;
    log(
      state,
      draw
        ? 'Time limit reached — the arena declares a draw.'
        : 'Time limit reached — the team with more HP remaining wins!',
    );
    return state;
  }

  const alivePerTeam = new Map<number, number>();
  for (const c of Object.values(state.combatants)) {
    if (c.alive) alivePerTeam.set(c.teamId, (alivePerTeam.get(c.teamId) ?? 0) + 1);
  }
  if (alivePerTeam.size === 1) {
    const [teamId] = [...alivePerTeam.keys()];
    state.winnerTeam = teamId;
    state.phase = 'MATCH_END';
    state.currentCombatantId = null;
    log(state, teamId === 0 ? 'Your team wins the match!' : 'The enemy team wins the match!');
  } else if (alivePerTeam.size === 0) {
    state.winnerTeam = -1;
    state.phase = 'MATCH_END';
    state.currentCombatantId = null;
    log(state, 'Draw — all combatants have fallen.');
  }
  return state;
}

// ------------------------------------------------------------
// Turn order & round flow
// ------------------------------------------------------------

export function computeTurnOrder(state: MatchState): string[] {
  const alive = Object.values(state.combatants).filter((c) => c.alive);
  alive.sort((a, b) => {
    const d = effectiveInitiative(b) - effectiveInitiative(a);
    return d !== 0 ? d : a.id < b.id ? -1 : 1; // deterministic tiebreak
  });
  return alive.map((c) => c.id);
}

// +1 ultimate charge to every living combatant with an ultimate, each round.
function chargeUltimatesForRound(state: MatchState): void {
  for (const c of Object.values(state.combatants)) {
    if (c.alive && c.ultimate) {
      c.ultimate.charge = Math.min(ULTIMATE_CHARGE_MAX, c.ultimate.charge + ULTIMATE_CHARGE_PER_ROUND);
    }
  }
}

function advanceRound(state: MatchState): MatchState {
  state.phase = 'ROUND_END';
  for (const c of Object.values(state.combatants)) {
    if (!c.alive) continue;
    tickDurations(c);
  }
  state.round += 1;
  state.turnIndex = 0;
  state.turnOrder = computeTurnOrder(state);
  // Ultimate charge lands AFTER a round completes (+1/round, +1/kill).
  chargeUltimatesForRound(state);
  log(state, `— Round ${state.round} —`);
  return beginTurn(state);
}

function advanceRoundStart(state: MatchState): MatchState {
  state.phase = 'ROUND_START';
  state.turnIndex = 0;
  state.turnOrder = computeTurnOrder(state);
  log(state, `— Round ${state.round} —`);
  return beginTurn(state);
}

// Applies start-of-turn effects; skips dead / stunned combatants automatically.
function beginTurn(state: MatchState): MatchState {
  for (;;) {
    checkWin(state);
    if (state.phase === 'MATCH_END') return state;
    const cid = state.turnOrder[state.turnIndex];
    if (!cid) return advanceRound(state);
    const c = state.combatants[cid];
    if (!c.alive) {
      state.turnIndex += 1;
      continue;
    }
    const dot = tickDoTs(c);
    if (dot > 0) log(state, `${c.name} takes ${dot} damage over time.`);
    const regen = tickRegen(c);
    if (regen > 0) log(state, `${c.name} regenerates ${regen} HP.`);
    if (c.hp <= 0) {
      // DoT kill — credit the DoT source (first one that dealt it).
      const source = c.effects.find((e) => EFFECT_META[e.kind].damageOverTime)?.sourceId;
      markDead(state, c, source);
      state.turnIndex += 1;
      continue;
    }
    if (isStunned(c)) {
      c.effects = c.effects.filter((e) => e.kind !== 'stun');
      log(state, `${c.name} is stunned and skips their turn!`);
      state.turnIndex += 1;
      continue;
    }
    state.phase = 'TURN_START';
    state.currentCombatantId = cid;
    log(state, `▶ ${c.name}'s turn.`);
    return state;
  }
}

function afterAction(state: MatchState): MatchState {
  for (const c of Object.values(state.combatants)) {
    if (c.hp <= 0 && c.alive) {
      markDead(state, c);
    }
  }
  checkWin(state);
  if (state.phase === 'MATCH_END') return state;
  state.turnIndex += 1;
  return beginTurn(state);
}

// ------------------------------------------------------------
// Actions
// ------------------------------------------------------------

export function applyAction(state: MatchState, action: PlayerAction): MatchState {
  if (state.phase === 'MATCH_END') return state;
  const actor = getCurrentCombatant(state);
  if (!actor || !actor.alive) return state;
  if (state.phase !== 'TURN_START' && state.phase !== 'PLAYER_ACTION') return state;
  state.phase = 'PLAYER_ACTION';

  let acted = true;
  if (action.type === 'USE_ABILITY') {
    acted = useAbility(state, actor, action.powerId, action.targetId);
  } else if (action.type === 'BASIC_ATTACK') {
    const targets = resolveTargets(state, actor, 'enemy', action.targetId);
    if (targets.length > 0) {
      const t = targets[0];
      const dmg = computeDamage(actor, t, { baseDamage: 1 });
      log(state, `${actor.name} performs a basic attack on ${t.name}.`);
      dealDamageTo(state, t, actor, dmg, 'basic attack');
    } else {
      acted = false;
    }
  }

  if (!acted) {
    // Invalid / fizzled action — do NOT consume the turn.
    state.phase = 'TURN_START';
    return state;
  }

  return afterAction(state);
}

function useAbility(state: MatchState, actor: Combatant, powerId: string, targetId?: string): boolean {
  const actives = actor.build?.actives ?? [];
  const power: PowerDefinition | undefined =
    actives.find((p) => p.id === powerId) ?? (actor.build?.ultimate?.id === powerId ? actor.build.ultimate : undefined);
  if (!power) return false;

  // Validate targets BEFORE spending any resource — a fizzle must never cost
  // an ability use or ultimate charge.
  const targets = resolveTargets(state, actor, power.targetRule, targetId);
  if (targets.length === 0 && power.targetRule !== 'none') {
    log(state, `${actor.name}'s ${power.name} fizzles — no valid targets.`);
    return false;
  }

  if (power.powerKind === 'ultimate') {
    if (!actor.ultimate || actor.ultimate.charge < ULTIMATE_CHARGE_MAX) return false;
    actor.ultimate.charge = 0;
  } else {
    const usesLeft = actor.usesLeft[powerId] ?? 0;
    if (usesLeft <= 0) return false;
    actor.usesLeft[powerId] = usesLeft - 1;
  }

  log(state, `${actor.name} uses ${power.name}!`);
  let dmgDealt = 0;
  for (const t of targets) {
    if ((power.baseDamage ?? 0) > 0 || (power.flatDamage ?? 0) > 0) {
      const dmg = computeDamage(actor, t, power);
      dmgDealt += dmg;
      dealDamageTo(state, t, actor, dmg, power.name);
    }
    if (power.healAmount) {
      const heal = Math.min(t.maxHp - t.hp, power.healAmount);
      t.hp += heal;
      log(state, `${t.name} recovers ${heal} HP.`);
    }
    if (power.effects) {
      for (const e of power.effects) {
        applyEffect(t, e, actor.id);
        const suffix = e.duration > 0 ? ` for ${e.duration} turns` : '';
        log(state, `${t.name} is afflicted with ${EFFECT_META[e.kind].label}${suffix}.`);
      }
    }
  }
  if (power.selfEffects) {
    for (const e of power.selfEffects) {
      applyEffect(actor, e, actor.id);
      log(state, `${actor.name} gains ${EFFECT_META[e.kind].label}.`);
    }
  }
  if (power.resetUses && actor.build) {
    for (const p of actor.build.actives) {
      actor.usesLeft[p.id] = maxUsesFor(p, actor.build);
    }
    log(state, `${actor.name}'s ability uses are fully restored!`);
  }
  if (power.lifesteal && dmgDealt > 0) {
    const drain = Math.round(dmgDealt * power.lifesteal);
    actor.hp = Math.min(actor.maxHp, actor.hp + drain);
    log(state, `${actor.name} drains ${drain} HP.`);
  }
  return true;
}

// ------------------------------------------------------------
// Match creation
// ------------------------------------------------------------

export function createMatch(input: MatchInput): MatchState {
  const combatants: Record<string, Combatant> = {};
  for (const team of input.teams) {
    for (const c of team.combatants) {
      const cb = makeCombatant(c);
      cb.teamId = team.teamId;
      for (const e of cb.build!.startingEffects) applyEffect(cb, e, cb.id);
      combatants[cb.id] = cb;
    }
  }
  const state: MatchState = {
    id: input.id,
    mode: input.mode,
    phase: 'ROUND_START',
    round: 1,
    turnOrder: [],
    turnIndex: 0,
    combatants,
    teamCount: input.teams.length,
    log: [],
    logSeq: 0,
    winnerTeam: null,
    currentCombatantId: null,
  };
  log(state, 'Match started. Good luck!');
  return advanceRoundStart(state);
}

// ------------------------------------------------------------
// Turn information for UI / AI
// ------------------------------------------------------------

export interface TurnActionInfo {
  power: PowerDefinition;
  usesLeft: number;
  maxUses: number;
  usable: boolean;
  isUltimate: boolean;
  reason: string;
}

export function getTurnActions(state: MatchState, combatantId: string): TurnActionInfo[] {
  const c = state.combatants[combatantId];
  if (!c || !c.build) return [];
  const list: TurnActionInfo[] = [];
  for (const p of c.build.actives) {
    const maxUses = maxUsesFor(p, c.build);
    const usesLeft = c.usesLeft[p.id] ?? 0;
    let reason = '';
    let usable = true;
    if (usesLeft <= 0) {
      usable = false;
      reason = 'Out of uses';
    }
    list.push({ power: p, usesLeft, maxUses, usable, isUltimate: false, reason });
  }
  if (c.build.ultimate) {
    const charge = c.ultimate?.charge ?? 0;
    list.push({
      power: c.build.ultimate,
      usesLeft: 0,
      maxUses: 0,
      usable: charge >= ULTIMATE_CHARGE_MAX,
      isUltimate: true,
      reason: charge >= ULTIMATE_CHARGE_MAX ? 'Ready!' : `Charge ${charge}/${ULTIMATE_CHARGE_MAX}`,
    });
  }
  return list;
}

export function isMyTurn(state: MatchState, combatantId: string): boolean {
  return state.currentCombatantId === combatantId && (state.phase === 'TURN_START' || state.phase === 'PLAYER_ACTION');
}

export function getMatchResultForPlayer(state: MatchState, playerId: string): 'victory' | 'defeat' | 'draw' | null {
  if (state.phase !== 'MATCH_END' || state.winnerTeam === null) return null;
  if (state.winnerTeam === -1) return 'draw';
  const me = Object.values(state.combatants).find((c) => c.playerId === playerId);
  if (!me) return null;
  return me.teamId === state.winnerTeam ? 'victory' : 'defeat';
}

export function roundsSurvived(state: MatchState): number {
  return Math.max(1, state.round - 1);
}

// Deterministic pseudo-random helpers (kept for future variance; unused in V1).
export function seededId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export type { LogEntry, MatchState };
