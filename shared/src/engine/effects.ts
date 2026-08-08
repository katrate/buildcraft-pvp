import { EFFECT_META } from '../game-data/effects';
import type { Combatant, EffectKind, EffectSpec, StatusInstance } from '../types';

let uidCounter = 0;
function nextUid(): string {
  uidCounter += 1;
  return `fx_${uidCounter}_${Date.now()}`;
}

export function makeStatus(spec: EffectSpec, sourceId: string): StatusInstance {
  const meta = EFFECT_META[spec.kind];
  return {
    ...spec,
    uid: nextUid(),
    sourceId,
    displayName: meta.label,
    icon: meta.icon,
  };
}

export function applyEffect(target: Combatant, spec: EffectSpec, sourceId: string): void {
  target.effects.push(makeStatus(spec, sourceId));
}

// DoT damage taken at the start of the affected combatant's turn.
export function tickDoTs(combatant: Combatant): number {
  let total = 0;
  for (const e of combatant.effects) {
    if (EFFECT_META[e.kind].damageOverTime) {
      total += e.amount;
    }
  }
  if (total > 0) {
    combatant.hp = Math.max(0, combatant.hp - total);
  }
  return total;
}

// Passive heal (regen) at the start of the combatant's turn.
export function tickRegen(combatant: Combatant): number {
  let total = 0;
  for (const e of combatant.effects) {
    if (e.kind === 'regen') total += e.amount;
  }
  if (total > 0) combatant.hp = Math.min(combatant.maxHp, combatant.hp + total);
  return total;
}

// Decrement durations for statuses at round end. duration 0 = permanent.
// Stun is NOT decremented here — it is consumed only when the victim's turn
// starts, so it always skips exactly one turn regardless of initiative order.
export function tickDurations(combatant: Combatant): void {
  combatant.effects = combatant.effects.filter((e) => {
    if (e.duration === 0 || e.kind === 'stun') return true;
    e.duration -= 1;
    return e.duration > 0;
  });
}

export function hasEffect(combatant: Combatant, kind: EffectKind): boolean {
  return combatant.effects.some((e) => e.kind === kind);
}

export function isStunned(combatant: Combatant): boolean {
  return hasEffect(combatant, 'stun');
}

export function isShielded(combatant: Combatant): boolean {
  return hasEffect(combatant, 'shield');
}

export function shieldAmount(combatant: Combatant): number {
  return combatant.effects.reduce((sum, e) => (e.kind === 'shield' ? sum + e.amount : sum), 0);
}
