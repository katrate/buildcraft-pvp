import type { EffectKind } from '../types';

export const EFFECT_META: Record<EffectKind, { label: string; icon: string; damageOverTime: boolean }> = {
  shield: { label: 'Shield', icon: '🛡', damageOverTime: false },
  poison: { label: 'Poison', icon: '☠', damageOverTime: true },
  burn: { label: 'Burn', icon: '🔥', damageOverTime: true },
  regen: { label: 'Regen', icon: '💚', damageOverTime: false },
  attack_up: { label: 'Attack Up', icon: '⚔', damageOverTime: false },
  attack_down: { label: 'Attack Down', icon: '⚔↓', damageOverTime: false },
  defense_up: { label: 'Defense Up', icon: '🛡↑', damageOverTime: false },
  defense_down: { label: 'Defense Down', icon: '🛡↓', damageOverTime: false },
  slow: { label: 'Slow', icon: '🐌', damageOverTime: false },
  haste: { label: 'Haste', icon: '⚡', damageOverTime: false },
  stun: { label: 'Stun', icon: '💫', damageOverTime: false },
  counter: { label: 'Counter', icon: '↩', damageOverTime: false },
  thorns: { label: 'Thorns', icon: '🌵', damageOverTime: false },
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
