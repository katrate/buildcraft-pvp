import type { EffectKind } from '../types';

// Icons are Iconify (Material Design) icon names rendered by the client's
// <I /> component — no emoji glyphs (replaced during the icon migration).
export const EFFECT_META: Record<EffectKind, { label: string; icon: string; damageOverTime: boolean }> = {
  shield: { label: 'Shield', icon: 'shield', damageOverTime: false },
  poison: { label: 'Poison', icon: 'skull', damageOverTime: true },
  burn: { label: 'Burn', icon: 'fire', damageOverTime: true },
  regen: { label: 'Regen', icon: 'heartPulse', damageOverTime: false },
  attack_up: { label: 'Attack Up', icon: 'swordCross', damageOverTime: false },
  attack_down: { label: 'Attack Down', icon: 'arrowDownBold', damageOverTime: false },
  defense_up: { label: 'Defense Up', icon: 'shieldCheck', damageOverTime: false },
  defense_down: { label: 'Defense Down', icon: 'shieldAlert', damageOverTime: false },
  slow: { label: 'Slow', icon: 'snail', damageOverTime: false },
  haste: { label: 'Haste', icon: 'lightningBolt', damageOverTime: false },
  stun: { label: 'Stun', icon: 'circleSlice8', damageOverTime: false },
  counter: { label: 'Counter', icon: 'reply', damageOverTime: false },
  thorns: { label: 'Thorns', icon: 'cactus', damageOverTime: false },
};

// Effective stat multipliers from buffs/debuffs.
// amount is a signed fraction: attack_up 0.4 -> +40% attack.
export function statMultiplier(effects: { kind: EffectKind; amount: number }[], kind: 'attack' | 'defense' | 'initiative'): number {
  const key =
    kind === 'attack' ? ['attack_up', 'attack_down'] : kind === 'defense' ? ['defense_up', 'defense_down'] : ['haste', 'slow'];
  let total = 1;
  for (const e of effects) {
    if (e.kind === key[0]) total += e.amount;
    if (e.kind === key[1]) total -= e.amount;
  }
  return Math.max(0.05, total);
}
