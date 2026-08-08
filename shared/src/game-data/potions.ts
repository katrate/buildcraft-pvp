import type { PotionDefinition, Rarity } from '../types';

// ------------------------------------------------------------
// Potions — consumables carried in the build's potion bag.
//
// Rules (enforced by the combat engine):
//   - Drunk during YOUR turn as a FREE action: never ends the turn
//     and does not consume an ability.
//   - Max ONE potion per turn, and only BEFORE you take your real
//     action (once you act, the potion window closes).
//   - Each potion has a fixed number of uses per match.
//
// Economy rule (V1): every purchase costs >= MIN_PURCHASE (1000).
// Prices scale by rarity: common 1000 · uncommon 1500 · rare 2000 ·
// epic 2500.
// ------------------------------------------------------------

export const POTIONS: Record<string, PotionDefinition> = {};

const PRICE: Record<Rarity, number> = { common: 1000, uncommon: 1500, rare: 2000, epic: 2500 };

function define(p: PotionDefinition) {
  POTIONS[p.id] = p;
}

// ------------------------------------------------------------
// HEALING
// ------------------------------------------------------------
define({
  id: 'minor_healing_potion', name: 'Minor Healing Potion', description: 'Drink to restore 35 HP. Free use once per turn.',
  kind: 'potion', price: PRICE.common, rarity: 'common', uses: 3, healAmount: 35,
});
define({
  id: 'healing_potion', name: 'Healing Potion', description: 'Drink to restore 60 HP. Free use once per turn.',
  kind: 'potion', price: PRICE.uncommon, rarity: 'uncommon', uses: 2, healAmount: 60,
});
define({
  id: 'greater_healing_potion', name: 'Greater Healing Potion', description: 'Drink to restore 100 HP. Free use once per turn.',
  kind: 'potion', price: PRICE.rare, rarity: 'rare', uses: 2, healAmount: 100,
});
define({
  id: 'elixir_of_life', name: 'Elixir of Life', description: 'Restore 150 HP in one gulp. Free use once per turn.',
  kind: 'potion', price: PRICE.epic, rarity: 'epic', uses: 1, healAmount: 150,
});

// ------------------------------------------------------------
// REGEN
// ------------------------------------------------------------
define({
  id: 'regen_potion', name: 'Regen Tonic', description: 'Regenerate 8 HP at the start of each of your turns for 4 turns.',
  kind: 'potion', price: PRICE.uncommon, rarity: 'uncommon', uses: 2,
  effects: [{ kind: 'regen', amount: 8, duration: 4 }],
});
define({
  id: 'greater_regen_potion', name: 'Greater Regen Tonic', description: 'Regenerate 14 HP per turn for 5 turns.',
  kind: 'potion', price: PRICE.rare, rarity: 'rare', uses: 2,
  effects: [{ kind: 'regen', amount: 14, duration: 5 }],
});

// ------------------------------------------------------------
// SHIELD
// ------------------------------------------------------------
define({
  id: 'shield_potion', name: 'Barrier Potion', description: 'Gain a shield that absorbs 45 damage.',
  kind: 'potion', price: PRICE.common, rarity: 'common', uses: 2,
  effects: [{ kind: 'shield', amount: 45, duration: 0 }],
});
define({
  id: 'greater_shield_potion', name: 'Aegis Potion', description: 'Gain a shield that absorbs 80 damage.',
  kind: 'potion', price: PRICE.rare, rarity: 'rare', uses: 2,
  effects: [{ kind: 'shield', amount: 80, duration: 0 }],
});
define({
  id: 'fortress_potion', name: 'Fortress Potion', description: 'Gain a 60-damage shield and +30% Defense for 2 turns.',
  kind: 'potion', price: PRICE.epic, rarity: 'epic', uses: 1,
  effects: [
    { kind: 'shield', amount: 60, duration: 0 },
    { kind: 'defense_up', amount: 0.3, duration: 2 },
  ],
});

// ------------------------------------------------------------
// OFFENSIVE BUFFS
// ------------------------------------------------------------
define({
  id: 'rage_potion', name: 'Rage Potion', description: '+30% Attack for 3 turns.',
  kind: 'potion', price: PRICE.uncommon, rarity: 'uncommon', uses: 2,
  effects: [{ kind: 'attack_up', amount: 0.3, duration: 3 }],
});
define({
  id: 'greater_rage_potion', name: 'Greater Rage Potion', description: '+50% Attack for 3 turns.',
  kind: 'potion', price: PRICE.rare, rarity: 'rare', uses: 2,
  effects: [{ kind: 'attack_up', amount: 0.5, duration: 3 }],
});
define({
  id: 'battle_potion', name: 'Battle Brew', description: '+20% Attack and +20% Defense for 2 turns.',
  kind: 'potion', price: PRICE.rare, rarity: 'rare', uses: 2,
  effects: [
    { kind: 'attack_up', amount: 0.2, duration: 2 },
    { kind: 'defense_up', amount: 0.2, duration: 2 },
  ],
});
define({
  id: 'berserker_potion', name: 'Berserker Brew', description: '+60% Attack but -20% Defense for 2 turns.',
  kind: 'potion', price: PRICE.epic, rarity: 'epic', uses: 1,
  effects: [
    { kind: 'attack_up', amount: 0.6, duration: 2 },
    { kind: 'defense_down', amount: 0.2, duration: 2 },
  ],
});

// ------------------------------------------------------------
// DEFENSIVE BUFFS
// ------------------------------------------------------------
define({
  id: 'stone_potion', name: 'Stone Skin Potion', description: '+40% Defense for 3 turns.',
  kind: 'potion', price: PRICE.uncommon, rarity: 'uncommon', uses: 2,
  effects: [{ kind: 'defense_up', amount: 0.4, duration: 3 }],
});
define({
  id: 'greater_stone_potion', name: 'Greater Stone Skin', description: '+60% Defense for 3 turns.',
  kind: 'potion', price: PRICE.rare, rarity: 'rare', uses: 2,
  effects: [{ kind: 'defense_up', amount: 0.6, duration: 3 }],
});
define({
  id: 'iron_potion', name: 'Ironhide Potion', description: '+30% Defense and reflect 12 damage when struck for 2 turns.',
  kind: 'potion', price: PRICE.epic, rarity: 'epic', uses: 1,
  effects: [
    { kind: 'defense_up', amount: 0.3, duration: 2 },
    { kind: 'thorns', amount: 12, duration: 2 },
  ],
});

// ------------------------------------------------------------
// SPEED
// ------------------------------------------------------------
define({
  id: 'haste_potion', name: 'Haste Potion', description: '+35% Initiative for 2 turns — act sooner.',
  kind: 'potion', price: PRICE.uncommon, rarity: 'uncommon', uses: 2,
  effects: [{ kind: 'haste', amount: 0.35, duration: 2 }],
});
define({
  id: 'greater_haste_potion', name: 'Greater Haste Potion', description: '+60% Initiative for 2 turns.',
  kind: 'potion', price: PRICE.rare, rarity: 'rare', uses: 2,
  effects: [{ kind: 'haste', amount: 0.6, duration: 2 }],
});

// ------------------------------------------------------------
// ULTIMATE CHARGE
// ------------------------------------------------------------
define({
  id: 'energy_potion', name: 'Energy Potion', description: 'Instantly gain 2 ultimate charge.',
  kind: 'potion', price: PRICE.rare, rarity: 'rare', uses: 2, ultimateCharge: 2,
});
define({
  id: 'great_energy_potion', name: 'Great Energy Potion', description: 'Instantly gain 4 ultimate charge.',
  kind: 'potion', price: PRICE.epic, rarity: 'epic', uses: 1, ultimateCharge: 4,
});

// ------------------------------------------------------------
// COMBOS / SITUATIONAL
// ------------------------------------------------------------
define({
  id: 'lifesteal_potion', name: 'Leech Potion', description: 'Restore 40 HP and gain +20% Attack for 2 turns.',
  kind: 'potion', price: PRICE.rare, rarity: 'rare', uses: 2,
  healAmount: 40,
  effects: [{ kind: 'attack_up', amount: 0.2, duration: 2 }],
});
define({
  id: 'purge_potion', name: 'Cleansing Draught', description: 'Restore 25 HP and shed all stuns and slows.',
  kind: 'potion', price: PRICE.uncommon, rarity: 'uncommon', uses: 2,
  healAmount: 25,
  effects: [
    { kind: 'haste', amount: 0.25, duration: 2 },
    { kind: 'attack_up', amount: 0.1, duration: 2 },
  ],
});
define({
  id: 'vengeance_potion', name: 'Vengeance Potion', description: 'Gain 25% of a shield and Counter 15 for 2 turns.',
  kind: 'potion', price: PRICE.rare, rarity: 'rare', uses: 1,
  effects: [
    { kind: 'shield', amount: 25, duration: 0 },
    { kind: 'counter', amount: 15, duration: 2 },
  ],
});

export function getPotion(id: string | null | undefined): PotionDefinition | null {
  return id ? POTIONS[id] ?? null : null;
}

export function getAllPotions(): PotionDefinition[] {
  return Object.values(POTIONS);
}
