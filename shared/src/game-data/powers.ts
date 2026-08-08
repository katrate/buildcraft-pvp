import type { PowerDefinition } from '../types';

// All powers in V1. Add new content by appending here — the combat
// engine interprets these definitions generically.
//
// Economy rule (V1): EVERY purchase costs >= MIN_PURCHASE (1000) so
// power cannot be stacked after one or two matches. Prices scale by
// rarity: common 1000 · uncommon 1500 · rare 2000 · epic 2500.

export const POWERS: Record<string, PowerDefinition> = {};

function define(p: PowerDefinition) {
  POWERS[p.id] = p;
}

// ------------------------------------------------------------
// CORE POWERS (passive identity + stats)
// ------------------------------------------------------------
define({
  id: 'flame_core', name: 'Flame Core', description: '+3 Attack. Your build burns hot.',
  kind: 'power', powerKind: 'core', slot: 'core', price: 1500, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 3 },
});
define({
  id: 'stone_core', name: 'Stone Core', description: '+30 HP, +3 Defense. Unyielding.',
  kind: 'power', powerKind: 'core', slot: 'core', price: 1500, rarity: 'uncommon',
  targetRule: 'none', statBonus: { maxHp: 30, defense: 3 },
});
define({
  id: 'gale_core', name: 'Gale Core', description: '+3 Initiative. Move first.',
  kind: 'power', powerKind: 'core', slot: 'core', price: 1500, rarity: 'uncommon',
  targetRule: 'none', statBonus: { initiative: 3 },
});

// ------------------------------------------------------------
// ACTIVE POWERS
// ------------------------------------------------------------
define({
  id: 'fire_bolt', name: 'Fire Bolt', description: 'Hurl a bolt of fire — 30 base damage plus your Attack.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: 1000, rarity: 'common',
  uses: 3, attack: 30, targetRule: 'enemy',
  damageType: 'fire', aiPriority: 8,
});
define({
  id: 'shield', name: 'Shield', description: 'Gain a shield that absorbs 45 damage.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: 1000, rarity: 'common',
  uses: 2, targetRule: 'self',
  selfEffects: [{ kind: 'shield', amount: 45, duration: 0 }], aiPriority: 4,
});
define({
  id: 'poison', name: 'Poison', description: '15 base damage plus your Attack, then 6 damage per turn for 3 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: 1000, rarity: 'common',
  uses: 2, attack: 15, targetRule: 'enemy', damageType: 'poison',
  effects: [{ kind: 'poison', amount: 8, duration: 3 }], aiPriority: 6,
});
define({
  id: 'berserk', name: 'Berserk', description: '+40% Attack but -15% Defense for 3 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: 1500, rarity: 'uncommon',
  uses: 2, targetRule: 'self',
  selfEffects: [
    { kind: 'attack_up', amount: 0.4, duration: 3 },
    { kind: 'defense_down', amount: 0.15, duration: 3 },
  ], aiPriority: 5,
});
define({
  id: 'slow', name: 'Slow', description: 'Target loses 35% initiative for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: 1000, rarity: 'common',
  uses: 3, targetRule: 'enemy',
  effects: [{ kind: 'slow', amount: 0.35, duration: 2 }], aiPriority: 3,
});
define({
  id: 'heal', name: 'Heal', description: 'Restore 40 HP to an ally (or yourself).',
  kind: 'power', powerKind: 'active', slot: 'active1', price: 1500, rarity: 'uncommon',
  uses: 2, healAmount: 40, targetRule: 'ally', aiPriority: 9,
});
define({
  id: 'thunder_bolt', name: 'Thunder Bolt', description: '34 base damage plus your Attack, and stun the target for 1 turn.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: 2000, rarity: 'rare',
  uses: 2, attack: 34, targetRule: 'enemy', damageType: 'lightning',
  effects: [{ kind: 'stun', amount: 1, duration: 1 }], aiPriority: 7,
});
define({
  id: 'fireball', name: 'Fireball', description: 'Blast ALL enemies for 24 base damage plus your Attack.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: 2000, rarity: 'rare',
  uses: 1, attack: 24, targetRule: 'all-enemies', damageType: 'fire', aiPriority: 8,
});
define({
  id: 'rally', name: 'Rally', description: 'All allies gain +20% Attack for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: 2000, rarity: 'rare',
  uses: 2, targetRule: 'all-allies',
  effects: [{ kind: 'attack_up', amount: 0.2, duration: 2 }], aiPriority: 3,
});
define({
  id: 'team_heal', name: 'Mass Mend', description: 'Heal all allies for 20 HP.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: 2000, rarity: 'rare',
  uses: 2, healAmount: 20, targetRule: 'all-allies', aiPriority: 8,
});
define({
  id: 'vampiric_strike', name: 'Vampiric Strike', description: '26 base damage plus your Attack, healing for 50% of damage dealt.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: 1500, rarity: 'uncommon',
  uses: 3, attack: 26, targetRule: 'enemy',
  lifesteal: 0.5, aiPriority: 7,
});

// ------------------------------------------------------------
// PASSIVE POWERS
// ------------------------------------------------------------
define({
  id: 'counter', name: 'Counter', description: 'Retaliate for 12 damage whenever you are attacked.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: 1500, rarity: 'uncommon',
  targetRule: 'none', effects: [{ kind: 'counter', amount: 12, duration: 0 }],
});
define({
  id: 'regeneration', name: 'Regeneration', description: 'Regenerate 10 HP at the start of each of your turns.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: 1500, rarity: 'uncommon',
  targetRule: 'none', effects: [{ kind: 'regen', amount: 10, duration: 0 }],
});
define({
  id: 'burning_soul', name: 'Burning Soul', description: '+15% Attack, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: 1500, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 0 }, // attack% handled via effects below
  effects: [{ kind: 'attack_up', amount: 0.15, duration: 0 }],
});
define({
  id: 'thorns', name: 'Thorns', description: 'Attackers take 10 damage when they hit you.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: 1500, rarity: 'uncommon',
  targetRule: 'none', effects: [{ kind: 'thorns', amount: 10, duration: 0 }],
});
define({
  id: 'swift', name: 'Swift', description: '+2 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: 1000, rarity: 'common',
  targetRule: 'none', statBonus: { initiative: 2 },
});
define({
  id: 'vitality', name: 'Vitality', description: '+25 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: 1000, rarity: 'common',
  targetRule: 'none', statBonus: { maxHp: 25 },
});

// ------------------------------------------------------------
// ULTIMATES
// ------------------------------------------------------------
define({
  id: 'inferno', name: 'Inferno', description: 'Unleash 70 base damage plus your Attack on ALL enemies.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: 2500, rarity: 'epic',
  attack: 70, targetRule: 'all-enemies', damageType: 'fire', aiPriority: 10,
});
define({
  id: 'iron_bulwark', name: 'Iron Bulwark', description: 'Gain a 60-damage shield and +40% Defense for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: 2500, rarity: 'epic',
  targetRule: 'self',
  selfEffects: [
    { kind: 'shield', amount: 60, duration: 0 },
    { kind: 'defense_up', amount: 0.4, duration: 2 },
  ], aiPriority: 2,
});
define({
  id: 'mass_renewal', name: 'Mass Renewal', description: 'Heal ALL allies for 40 HP.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: 2500, rarity: 'epic',
  healAmount: 40, targetRule: 'all-allies', aiPriority: 9,
});
define({
  id: 'overclock', name: 'Overclock', description: 'Reset ALL of your ability uses. Fire everything again.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: 2500, rarity: 'epic',
  targetRule: 'self', resetUses: true, aiPriority: 1,
});

export function getPower(id: string | null | undefined): PowerDefinition | null {
  return id ? POWERS[id] ?? null : null;
}

export function getPowersByKind(kind: PowerDefinition['powerKind']): PowerDefinition[] {
  return Object.values(POWERS).filter((p) => p.powerKind === kind);
}

export function getAllPowers(): PowerDefinition[] {
  return Object.values(POWERS);
}
