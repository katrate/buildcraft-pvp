import type { Combatant, MatchState, PlayerAction, PowerDefinition } from '../types';
import {
  aliveAllies,
  aliveEnemies,
  getTurnActions,
  isMyTurn,
} from './combat';

// ------------------------------------------------------------
// Simple, deterministic bot AI.
// Priority:
//   1. Emergency self-defense (heal / shield / defense buff) when low HP
//   2. Heal a hurt ally
//   3. Ready offensive ultimate
//   4. Best damaging ability
//   5. Offensive self-buff
//   6. Basic attack
// ------------------------------------------------------------

export function chooseBotAction(state: MatchState, combatantId: string): PlayerAction {
  const bot = state.combatants[combatantId];
  if (!bot || !bot.alive || !isMyTurn(state, combatantId)) return { type: 'END_TURN' };

  const enemies = aliveEnemies(state, combatantId).sort((a, b) => (a.hp - b.hp !== 0 ? a.hp - b.hp : a.id.localeCompare(b.id)));
  if (enemies.length === 0) return { type: 'END_TURN' };

  const allies = aliveAllies(state, combatantId);
  const lowHp = bot.hp <= bot.maxHp * 0.4;
  const actions = getTurnActions(state, combatantId);
  const usable = actions.filter((a) => a.usable);

  // 1. Emergency self-defense
  if (lowHp) {
    const def = usable
      .filter((a) => a.power.targetRule === 'self' && (a.power.healAmount !== undefined || a.power.selfEffects?.some((e) => e.kind === 'shield' || e.kind === 'defense_up')))
      .sort((a, b) => powerValue(b.power) - powerValue(a.power));
    if (def.length > 0) return usePower(def[0].power, bot.id);
  }

  // 2. Heal a hurt ally (only if we actually have a heal power)
  const heals = usable.filter((a) => a.power.healAmount !== undefined && (a.power.targetRule === 'ally' || a.power.targetRule === 'all-allies'));
  if (heals.length > 0) {
    const hurt = allies.filter((a) => a.hp < a.maxHp * 0.5);
    if (hurt.length > 0) {
      const healer = heals.sort((a, b) => powerValue(b.power) - powerValue(a.power))[0];
      if (healer.power.targetRule === 'all-allies') return usePower(healer.power, bot.id);
      const target = hurt.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      return usePower(healer.power, target.id);
    }
  }

  // 3. Ultimate
  const ult = usable.find((a) => a.isUltimate);
  if (ult) {
    if (ult.power.targetRule === 'all-enemies') return usePower(ult.power, bot.id);
    if (ult.power.targetRule === 'all-allies' && allies.some((a) => a.hp < a.maxHp * 0.7)) return usePower(ult.power, bot.id);
    if (ult.power.targetRule === 'self' && (lowHp || allies.length <= 1)) return usePower(ult.power, bot.id);
  }

  // 4. Best damaging ability
  const damageAbilities = usable
    .filter((a) => a.power.targetRule === 'enemy' || a.power.targetRule === 'all-enemies')
    .sort((a, b) => (b.power.aiPriority ?? 0) - (a.power.aiPriority ?? 0));
  if (damageAbilities.length > 0) {
    const best = damageAbilities[0];
    if (best.power.targetRule === 'all-enemies') return usePower(best.power, bot.id);
    return usePower(best.power, enemies[0].id);
  }

  // 5. Offensive self-buff when healthy
  const buffs = usable.filter((a) => a.power.targetRule === 'self' && a.power.selfEffects?.some((e) => e.kind === 'attack_up'));
  if (buffs.length > 0 && bot.hp > bot.maxHp * 0.5) {
    return usePower(buffs.sort((a, b) => powerValue(b.power) - powerValue(a.power))[0].power, bot.id);
  }

  // 6. Basic attack
  return { type: 'BASIC_ATTACK', targetId: enemies[0].id };
}

function usePower(power: PowerDefinition, targetId: string): PlayerAction {
  return { type: 'USE_ABILITY', powerId: power.id, targetId };
}

function powerValue(p: PowerDefinition): number {
  return (p.healAmount ?? 0) + (p.baseDamage ?? 0) * 10 + (p.flatDamage ?? 0) + (p.aiPriority ?? 0);
}
