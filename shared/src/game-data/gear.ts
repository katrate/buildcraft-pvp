import type { GearDefinition } from '../types';

// All gear in V1. Data-driven — append here to add content.
//
// Economy rule (V1): EVERY purchase costs >= MIN_PURCHASE (1000) so gear
// cannot be stacked after one or two matches. Prices scale by rarity:
// common 1000 · uncommon 1500 · rare 2000 · epic 2500.

export const GEAR: Record<string, GearDefinition> = {};

function define(g: GearDefinition) {
  GEAR[g.id] = g;
}

// ------------------------------------------------------------
// WEAPONS
// ------------------------------------------------------------
define({
  id: 'iron_sword', name: 'Iron Sword', description: '+3 Attack. Reliable steel.',
  kind: 'gear', slot: 'weapon', price: 1000, rarity: 'common',
  stats: { attack: 3 },
});
define({
  id: 'light_blade', name: 'Light Blade', description: '+2 Attack, +2 Initiative. Strike first.',
  kind: 'gear', slot: 'weapon', price: 1500, rarity: 'uncommon',
  stats: { attack: 2, initiative: 2 },
});
define({
  id: 'war_hammer', name: 'War Hammer', description: '+5 Attack, -2 Initiative. Slow but devastating.',
  kind: 'gear', slot: 'weapon', price: 1500, rarity: 'uncommon',
  stats: { attack: 5, initiative: -2 },
});

// ------------------------------------------------------------
// ARMOR
// ------------------------------------------------------------
define({
  id: 'leather_armor', name: 'Leather Armor', description: '+2 Defense. Light padding.',
  kind: 'gear', slot: 'armor', price: 1000, rarity: 'common',
  stats: { defense: 2 },
});
define({
  id: 'light_armor', name: 'Light Armor', description: '+2 Defense, +2 Initiative.',
  kind: 'gear', slot: 'armor', price: 1500, rarity: 'uncommon',
  stats: { defense: 2, initiative: 2 },
});
define({
  id: 'heavy_armor', name: 'Heavy Armor', description: '+4 Defense, +20 HP, -2 Initiative.',
  kind: 'gear', slot: 'armor', price: 2000, rarity: 'rare',
  stats: { defense: 4, maxHp: 20, initiative: -2 },
});

// ------------------------------------------------------------
// UTILITY
// ------------------------------------------------------------
define({
  id: 'energy_core', name: 'Energy Core', description: '+1 extra use for every equipped active power.',
  kind: 'gear', slot: 'utility', price: 1000, rarity: 'common',
  stats: {},
  bonusAbilityUses: 1,
});
define({
  id: 'speed_module', name: 'Speed Module', description: '+3 Initiative.',
  kind: 'gear', slot: 'utility', price: 1000, rarity: 'common',
  stats: { initiative: 3 },
});
define({
  id: 'life_amulet', name: 'Life Amulet', description: '+25 Max HP.',
  kind: 'gear', slot: 'utility', price: 1500, rarity: 'uncommon',
  stats: { maxHp: 25 },
});
define({
  id: 'reactive_shield', name: 'Reactive Shield', description: 'Start each fight with a 30-damage shield.',
  kind: 'gear', slot: 'utility', price: 2000, rarity: 'rare',
  stats: {},
  effects: [{ kind: 'shield', amount: 30, duration: 0 }],
});

export function getGear(id: string | null | undefined): GearDefinition | null {
  return id ? GEAR[id] ?? null : null;
}

export function getAllGear(): GearDefinition[] {
  return Object.values(GEAR);
}
