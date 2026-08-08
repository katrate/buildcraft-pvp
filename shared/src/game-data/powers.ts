import type { PowerDefinition, Rarity } from '../types';

// All powers in V1. Add new content by appending here — the combat
// engine interprets these definitions generically.
//
// Economy rule (V1): EVERY purchase costs >= MIN_PURCHASE (1000) so
// power cannot be stacked after one or two matches. Prices scale by
// rarity: common 1000 · uncommon 1500 · rare 2000 · epic 2500.
//
// Damage scale (see engine/combat.ts):
//   damage = power.attack + caster Attack - defender Defense (min 1)
// Base Attack 20, base Defense 5, base HP 200. 50 items per category.

export const POWERS: Record<string, PowerDefinition> = {};

const PRICE: Record<Rarity, number> = { common: 1000, uncommon: 1500, rare: 2000, epic: 2500 };

function define(p: PowerDefinition) {
  POWERS[p.id] = p;
}

// ------------------------------------------------------------
// CORE POWERS (passive identity + stats) — 50
// ------------------------------------------------------------
define({
  id: 'flame_core', name: 'Flame Core', description: '+3 Attack. Your build burns hot.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 3 },
});
define({
  id: 'stone_core', name: 'Stone Core', description: '+30 HP, +3 Defense. Unyielding.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { maxHp: 30, defense: 3 },
});
define({
  id: 'gale_core', name: 'Gale Core', description: '+3 Initiative. Move first.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { initiative: 3 },
});
define({
  id: 'frost_core', name: 'Frost Core', description: '+25 HP, +2 Defense. Cold as ice.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { maxHp: 25, defense: 2 },
});
define({
  id: 'storm_core', name: 'Storm Core', description: '+2 Attack, +2 Initiative. Strike like lightning.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 2, initiative: 2 },
});
define({
  id: 'tide_core', name: 'Tide Core', description: '+20 HP, +2 Attack. Relentless flow.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { maxHp: 20, attack: 2 },
});
define({
  id: 'magma_core', name: 'Magma Core', description: '+5 Attack, -1 Initiative. Slow, molten fury.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 5, initiative: -1 },
});
define({
  id: 'obsidian_core', name: 'Obsidian Core', description: '+5 Defense. A wall of black glass.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { defense: 5 },
});
define({
  id: 'crystal_core', name: 'Crystal Core', description: '+40 HP. Refined and durable.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { maxHp: 40 },
});
define({
  id: 'iron_core', name: 'Iron Core', description: '+3 Defense, +1 Initiative. Tempered steel.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { defense: 3, initiative: 1 },
});
define({
  id: 'titan_core', name: 'Titan Core', description: '+50 HP, -2 Initiative. A walking mountain.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { maxHp: 50, initiative: -2 },
});
define({
  id: 'blood_core', name: 'Blood Core', description: '+3 Attack, +1 Initiative. Hunted and hunting.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 3, initiative: 1 },
});
define({
  id: 'venom_core', name: 'Venom Core', description: '+2 Attack, +2 Defense. Stings twice.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 2, defense: 2 },
});
define({
  id: 'light_core', name: 'Light Core', description: '+2 Attack, +1 Defense. Bright and balanced.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { attack: 2, defense: 1 },
});
define({
  id: 'void_core', name: 'Void Core', description: '+4 Attack. Drawn from the emptiness.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 4 },
});
define({
  id: 'aether_core', name: 'Aether Core', description: '+2 Attack, +1 Initiative. Pure potential.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { attack: 2, initiative: 1 },
});
define({
  id: 'phantom_core', name: 'Phantom Core', description: '+2 Initiative, +1 Defense. Hard to pin down.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { initiative: 2, defense: 1 },
});
define({
  id: 'serpent_core', name: 'Serpent Core', description: '+1 Attack, +1 Defense, +1 Initiative. All-rounder.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { attack: 1, defense: 1, initiative: 1 },
});
define({
  id: 'wolf_core', name: 'Wolf Core', description: '+3 Initiative. Pack instincts.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { initiative: 3 },
});
define({
  id: 'bear_core', name: 'Bear Core', description: '+35 HP, +2 Defense. Raw strength.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { maxHp: 35, defense: 2 },
});
define({
  id: 'eagle_core', name: 'Eagle Core', description: '+4 Initiative. Sovereign of the skies.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { initiative: 4 },
});
define({
  id: 'dragon_core', name: 'Dragon Core', description: '+5 Attack, +1 Initiative. Apex predator.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { attack: 5, initiative: 1 },
});
define({
  id: 'griffin_core', name: 'Griffin Core', description: '+2 Attack, +3 Initiative. Swift and deadly.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 2, initiative: 3 },
});
define({
  id: 'minotaur_core', name: 'Minotaur Core', description: '+4 Attack, +1 Defense. Labyrinth fury.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 4, defense: 1 },
});
define({
  id: 'golem_core', name: 'Golem Core', description: '+60 HP. Ancient living stone.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { maxHp: 60 },
});
define({
  id: 'djinn_core', name: 'Djinn Core', description: '+2 Attack, +2 Initiative. Made of wishes.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 2, initiative: 2 },
});
define({
  id: 'phoenix_core', name: 'Phoenix Core', description: '+2 Attack, +20 HP. Rises again.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 2, maxHp: 20 },
});
define({
  id: 'kraken_core', name: 'Kraken Core', description: '+3 Defense, +1 Initiative. Depths below.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { defense: 3, initiative: 1 },
});
define({
  id: 'hydra_core', name: 'Hydra Core', description: '+30 HP, +2 Attack. Many heads, one will.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { maxHp: 30, attack: 2 },
});
define({
  id: 'chimera_core', name: 'Chimera Core', description: '+3 Attack, +2 Defense. Born of three beasts.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { attack: 3, defense: 2 },
});
define({
  id: 'basilisk_core', name: 'Basilisk Core', description: '+2 Defense, +2 Initiative. Gaze of stone.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { defense: 2, initiative: 2 },
});
define({
  id: 'wyvern_core', name: 'Wyvern Core', description: '+3 Attack, +2 Initiative. Winged venom.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 3, initiative: 2 },
});
define({
  id: 'behemoth_core', name: 'Behemoth Core', description: '+70 HP, -3 Initiative. Impossibly huge.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { maxHp: 70, initiative: -3 },
});
define({
  id: 'colossus_core', name: 'Colossus Core', description: '+50 HP, +2 Defense. Unbreakable.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { maxHp: 50, defense: 2 },
});
define({
  id: 'revenant_core', name: 'Revenant Core', description: '+4 Attack, +1 Initiative. Refuses to die.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 4, initiative: 1 },
});
define({
  id: 'wraith_core', name: 'Wraith Core', description: '+2 Attack, +2 Initiative. Half in this world.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 2, initiative: 2 },
});
define({
  id: 'banshee_core', name: 'Banshee Core', description: '+3 Initiative, +1 Defense. Screams first.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { initiative: 3, defense: 1 },
});
define({
  id: 'specter_core', name: 'Specter Core', description: '+2 Attack, +3 Initiative. Afterimage strikes.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 2, initiative: 3 },
});
define({
  id: 'abyss_core', name: 'Abyss Core', description: '+5 Attack, -2 Defense. Everything it touches.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { attack: 5, defense: -2 },
});
define({
  id: 'eclipse_core', name: 'Eclipse Core', description: '+3 Attack, +3 Initiative. Swallowed light.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { attack: 3, initiative: 3 },
});
define({
  id: 'solar_core', name: 'Solar Core', description: '+4 Attack, +1 Defense. Blinding noon.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 4, defense: 1 },
});
define({
  id: 'lunar_core', name: 'Lunar Core', description: '+30 HP, +3 Initiative. Night\'s grace.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { maxHp: 30, initiative: 3 },
});
define({
  id: 'comet_core', name: 'Comet Core', description: '+6 Initiative, -1 Defense. Nothing outruns it.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { initiative: 6, defense: -1 },
});
define({
  id: 'meteor_core', name: 'Meteor Core', description: '+6 Attack, -2 Initiative. Extinction from above.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { attack: 6, initiative: -2 },
});
define({
  id: 'nebula_core', name: 'Nebula Core', description: '+2 Attack, +2 Defense, +1 Initiative. Endless.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { attack: 2, defense: 2, initiative: 1 },
});
define({
  id: 'quasar_core', name: 'Quasar Core', description: '+4 Attack, +2 Initiative. A collapsed star.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { attack: 4, initiative: 2 },
});
define({
  id: 'prism_core', name: 'Prism Core', description: '+2 Attack, +2 Defense. Every colour, one edge.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 2, defense: 2 },
});
define({
  id: 'rune_core', name: 'Rune Core', description: '+1 Attack, +1 Defense, +1 Initiative. Carved destiny.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { attack: 1, defense: 1, initiative: 1 },
});
define({
  id: 'arcane_core', name: 'Arcane Core', description: '+3 Attack, +1 Defense. Mystery made blade.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 3, defense: 1 },
});
define({
  id: 'chaos_core', name: 'Chaos Core', description: '+4 Attack, +2 Defense. Entropy given form.',
  kind: 'power', powerKind: 'core', slot: 'core', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { attack: 4, defense: 2 },
});

// ------------------------------------------------------------
// ACTIVE POWERS — 50
// ------------------------------------------------------------
define({
  id: 'fire_bolt', name: 'Fire Bolt', description: 'Hurl a bolt of fire — 30 base damage plus your Attack.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 3, attack: 30, targetRule: 'enemy',
  damageType: 'fire', aiPriority: 8,
});
define({
  id: 'shield', name: 'Shield', description: 'Gain a shield that absorbs 45 damage.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 2, targetRule: 'self',
  selfEffects: [{ kind: 'shield', amount: 45, duration: 0 }], aiPriority: 4,
});
define({
  id: 'poison', name: 'Poison', description: '15 base damage plus your Attack, then 6 damage per turn for 3 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 2, attack: 15, targetRule: 'enemy', damageType: 'poison',
  effects: [{ kind: 'poison', amount: 8, duration: 3 }], aiPriority: 7,
});
define({
  id: 'berserk', name: 'Berserk', description: '+40% Attack but -15% Defense for 3 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 2, targetRule: 'self',
  selfEffects: [
    { kind: 'attack_up', amount: 0.4, duration: 3 },
    { kind: 'defense_down', amount: 0.15, duration: 3 },
  ], aiPriority: 5,
});
define({
  id: 'slow', name: 'Slow', description: 'Target loses 35% initiative for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 3, targetRule: 'enemy',
  effects: [{ kind: 'slow', amount: 0.35, duration: 2 }], aiPriority: 3,
});
define({
  id: 'heal', name: 'Heal', description: 'Restore 40 HP to an ally (or yourself).',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 2, healAmount: 40, targetRule: 'ally', aiPriority: 9,
});
define({
  id: 'thunder_bolt', name: 'Thunder Bolt', description: '34 base damage plus your Attack, and stun the target for 1 turn.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, attack: 34, targetRule: 'enemy', damageType: 'lightning',
  effects: [{ kind: 'stun', amount: 1, duration: 1 }], aiPriority: 9,
});
define({
  id: 'fireball', name: 'Fireball', description: 'Blast ALL enemies for 24 base damage plus your Attack.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 1, attack: 24, targetRule: 'all-enemies', damageType: 'fire', aiPriority: 6,
});
define({
  id: 'rally', name: 'Rally', description: 'All allies gain +20% Attack for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, targetRule: 'all-allies',
  effects: [{ kind: 'attack_up', amount: 0.2, duration: 2 }], aiPriority: 3,
});
define({
  id: 'team_heal', name: 'Mass Mend', description: 'Heal all allies for 20 HP.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, healAmount: 20, targetRule: 'all-allies', aiPriority: 8,
});
define({
  id: 'vampiric_strike', name: 'Vampiric Strike', description: '26 base damage plus your Attack, healing for 50% of damage dealt.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 3, attack: 26, targetRule: 'enemy',
  lifesteal: 0.5, aiPriority: 7,
});
define({
  id: 'ice_lance', name: 'Ice Lance', description: '26 base damage plus your Attack, and slow the target.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 3, attack: 26, targetRule: 'enemy',
  effects: [{ kind: 'slow', amount: 0.3, duration: 2 }], aiPriority: 8,
});
define({
  id: 'arcane_bolt', name: 'Arcane Bolt', description: '24 base damage plus your Attack. Pure arcane force.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 4, attack: 24, targetRule: 'enemy', aiPriority: 7,
});
define({
  id: 'holy_smite', name: 'Holy Smite', description: '30 base damage plus your Attack, and -20% target Attack for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 2, attack: 30, targetRule: 'enemy', damageType: 'holy',
  effects: [{ kind: 'attack_down', amount: 0.2, duration: 2 }], aiPriority: 8,
});
define({
  id: 'shadow_bolt', name: 'Shadow Bolt', description: '28 base damage plus your Attack, healing for 30% dealt.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 3, attack: 28, targetRule: 'enemy',
  lifesteal: 0.3, aiPriority: 7,
});
define({
  id: 'lava_burst', name: 'Lava Burst', description: '32 base damage plus your Attack.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, attack: 32, targetRule: 'enemy', damageType: 'fire', aiPriority: 8,
});
define({
  id: 'chain_lightning', name: 'Chain Lightning', description: '20 base damage plus your Attack to ALL enemies.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 1, attack: 20, targetRule: 'all-enemies', damageType: 'lightning', aiPriority: 6,
});
define({
  id: 'frost_nova', name: 'Frost Nova', description: '14 base damage plus your Attack to ALL enemies and slow them.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 2, attack: 14, targetRule: 'all-enemies',
  effects: [{ kind: 'slow', amount: 0.25, duration: 2 }], aiPriority: 5,
});
define({
  id: 'meteor', name: 'Meteor', description: '40 base damage plus your Attack.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 1, attack: 40, targetRule: 'enemy', damageType: 'fire', aiPriority: 9,
});
define({
  id: 'earth_shatter', name: 'Earth Shatter', description: '20 base damage plus your Attack to ALL enemies, stunning them.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 1, attack: 20, targetRule: 'all-enemies',
  effects: [{ kind: 'stun', amount: 1, duration: 1 }], aiPriority: 7,
});
define({
  id: 'wind_cutter', name: 'Wind Cutter', description: '24 base damage plus your Attack. Razor air.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 4, attack: 24, targetRule: 'enemy', aiPriority: 7,
});
define({
  id: 'poison_dart', name: 'Poison Dart', description: '12 base damage plus your Attack, then 6 poison per turn for 3 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 3, attack: 12, targetRule: 'enemy', damageType: 'poison',
  effects: [{ kind: 'poison', amount: 6, duration: 3 }], aiPriority: 6,
});
define({
  id: 'curse', name: 'Curse', description: 'Target loses 30% Attack for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 3, targetRule: 'enemy',
  effects: [{ kind: 'attack_down', amount: 0.3, duration: 2 }], aiPriority: 3,
});
define({
  id: 'weaken', name: 'Weaken', description: 'Target loses 30% Defense for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 3, targetRule: 'enemy',
  effects: [{ kind: 'defense_down', amount: 0.3, duration: 2 }], aiPriority: 3,
});
define({
  id: 'fortify', name: 'Fortify', description: '+30% Defense for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 2, targetRule: 'self',
  selfEffects: [{ kind: 'defense_up', amount: 0.3, duration: 2 }], aiPriority: 3,
});
define({
  id: 'adrenaline', name: 'Adrenaline', description: '+30% Attack for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 2, targetRule: 'self',
  selfEffects: [{ kind: 'attack_up', amount: 0.3, duration: 2 }], aiPriority: 4,
});
define({
  id: 'shadow_step', name: 'Shadow Step', description: '+50% Initiative for 1 turn. Slip past them.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 2, targetRule: 'self',
  selfEffects: [{ kind: 'haste', amount: 0.5, duration: 1 }], aiPriority: 2,
});
define({
  id: 'second_wind', name: 'Second Wind', description: 'Restore 30 HP to yourself.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 2, healAmount: 30, targetRule: 'self', aiPriority: 8,
});
define({
  id: 'mend', name: 'Mend', description: 'Restore 25 HP and regenerate 5 HP per turn for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 2, healAmount: 25, targetRule: 'ally',
  effects: [{ kind: 'regen', amount: 5, duration: 2 }], aiPriority: 8,
});
define({
  id: 'stun_bolt', name: 'Stun Bolt', description: '10 base damage plus your Attack and stun the target.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, attack: 10, targetRule: 'enemy',
  effects: [{ kind: 'stun', amount: 1, duration: 1 }], aiPriority: 8,
});
define({
  id: 'freeze', name: 'Freeze', description: '8 base damage plus your Attack, stunning and slowing the target.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, attack: 8, targetRule: 'enemy',
  effects: [
    { kind: 'stun', amount: 1, duration: 1 },
    { kind: 'slow', amount: 0.3, duration: 2 },
  ], aiPriority: 9,
});
define({
  id: 'blind', name: 'Blind', description: 'Target loses 40% Attack for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 2, targetRule: 'enemy',
  effects: [{ kind: 'attack_down', amount: 0.4, duration: 2 }], aiPriority: 4,
});
define({
  id: 'terrify', name: 'Terrify', description: 'Target loses 40% Defense for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 2, targetRule: 'enemy',
  effects: [{ kind: 'defense_down', amount: 0.4, duration: 2 }], aiPriority: 4,
});
define({
  id: 'battle_cry', name: 'Battle Cry', description: 'All allies gain +25% Attack for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, targetRule: 'all-allies',
  effects: [{ kind: 'attack_up', amount: 0.25, duration: 2 }], aiPriority: 3,
});
define({
  id: 'war_shout', name: 'War Shout', description: 'All allies gain +25% Defense for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, targetRule: 'all-allies',
  effects: [{ kind: 'defense_up', amount: 0.25, duration: 2 }], aiPriority: 3,
});
define({
  id: 'inspire', name: 'Inspire', description: 'All allies recover 15 HP.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 2, healAmount: 15, targetRule: 'all-allies', aiPriority: 8,
});
define({
  id: 'radiant_flare', name: 'Radiant Flare', description: '18 base damage plus your Attack to ALL enemies, weakening them.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 1, attack: 18, targetRule: 'all-enemies', damageType: 'holy',
  effects: [{ kind: 'attack_down', amount: 0.2, duration: 2 }], aiPriority: 6,
});
define({
  id: 'plague', name: 'Plague', description: '10 base damage plus your Attack, then 5 poison per turn for 4 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, attack: 10, targetRule: 'enemy', damageType: 'poison',
  effects: [{ kind: 'poison', amount: 5, duration: 4 }], aiPriority: 7,
});
define({
  id: 'storm_call', name: 'Storm Call', description: '26 base damage plus your Attack to ALL enemies.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 1, attack: 26, targetRule: 'all-enemies', damageType: 'lightning', aiPriority: 6,
});
define({
  id: 'frost_bolt', name: 'Frost Bolt', description: '22 base damage plus your Attack and slow the target.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.common, rarity: 'common',
  uses: 3, attack: 22, targetRule: 'enemy',
  effects: [{ kind: 'slow', amount: 0.3, duration: 2 }], aiPriority: 7,
});
define({
  id: 'ember_bolt', name: 'Ember Bolt', description: '30 base damage plus your Attack and burn for 5 per turn.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 2, attack: 30, targetRule: 'enemy', damageType: 'fire',
  effects: [{ kind: 'burn', amount: 5, duration: 2 }], aiPriority: 8,
});
define({
  id: 'venom_strike', name: 'Venom Strike', description: '24 base damage plus your Attack and 7 poison per turn for 3 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, attack: 24, targetRule: 'enemy', damageType: 'poison',
  effects: [{ kind: 'poison', amount: 7, duration: 3 }], aiPriority: 8,
});
define({
  id: 'soul_drain', name: 'Soul Drain', description: '20 base damage plus your Attack, healing for 60% dealt.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, attack: 20, targetRule: 'enemy',
  lifesteal: 0.6, aiPriority: 7,
});
define({
  id: 'heavy_blow', name: 'Heavy Blow', description: '44 base damage plus your Attack. A devastating swing.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.epic, rarity: 'epic',
  uses: 1, attack: 44, targetRule: 'enemy', aiPriority: 9,
});
define({
  id: 'void_bolt', name: 'Void Bolt', description: '42 base damage plus your Attack, weakening the target.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.epic, rarity: 'epic',
  uses: 1, attack: 42, targetRule: 'enemy',
  effects: [{ kind: 'attack_down', amount: 0.25, duration: 2 }], aiPriority: 9,
});
define({
  id: 'judgment', name: 'Judgment', description: '46 base damage plus your Attack, and stun the target.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.epic, rarity: 'epic',
  uses: 1, attack: 46, targetRule: 'enemy', damageType: 'holy',
  effects: [{ kind: 'stun', amount: 1, duration: 1 }], aiPriority: 10,
});

define({
  id: 'venom_slash', name: 'Venom Slash', description: '20 base damage plus your Attack, then 6 poison per turn for 2 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 3, attack: 20, targetRule: 'enemy', damageType: 'poison',
  effects: [{ kind: 'poison', amount: 6, duration: 2 }], aiPriority: 7,
});
define({
  id: 'crippling_blow', name: 'Crippling Blow', description: '28 base damage plus your Attack, shredding 25% of the target Defense.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, attack: 28, targetRule: 'enemy',
  effects: [{ kind: 'defense_down', amount: 0.25, duration: 2 }], aiPriority: 8,
});
define({
  id: 'overwhelm', name: 'Overwhelm', description: '36 base damage plus your Attack. Brute force.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.rare, rarity: 'rare',
  uses: 2, attack: 36, targetRule: 'enemy', aiPriority: 8,
});
define({
  id: 'iron_will', name: 'Iron Will', description: '+25% Defense for 3 turns.',
  kind: 'power', powerKind: 'active', slot: 'active1', price: PRICE.uncommon, rarity: 'uncommon',
  uses: 2, targetRule: 'self',
  selfEffects: [{ kind: 'defense_up', amount: 0.25, duration: 3 }], aiPriority: 3,
});

// ------------------------------------------------------------
// PASSIVE POWERS — 50
// ------------------------------------------------------------
define({
  id: 'counter', name: 'Counter', description: 'Retaliate for 12 damage whenever you are attacked.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', effects: [{ kind: 'counter', amount: 12, duration: 0 }],
});
define({
  id: 'regeneration', name: 'Regeneration', description: 'Regenerate 10 HP at the start of each of your turns.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', effects: [{ kind: 'regen', amount: 10, duration: 0 }],
});
define({
  id: 'burning_soul', name: 'Burning Soul', description: '+15% Attack, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 0 },
  effects: [{ kind: 'attack_up', amount: 0.15, duration: 0 }],
});
define({
  id: 'thorns', name: 'Thorns', description: 'Attackers take 10 damage when they hit you.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', effects: [{ kind: 'thorns', amount: 10, duration: 0 }],
});
define({
  id: 'swift', name: 'Swift', description: '+2 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { initiative: 2 },
});
define({
  id: 'vitality', name: 'Vitality', description: '+25 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { maxHp: 25 },
});
define({
  id: 'iron_flesh', name: 'Iron Flesh', description: '+2 Defense, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { defense: 2 },
});
define({
  id: 'heavy_bone', name: 'Heavy Bone', description: '+3 Defense, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { defense: 3 },
});
define({
  id: 'warrior_spirit', name: 'Warrior Spirit', description: '+2 Attack, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { attack: 2 },
});
define({
  id: 'killing_intent', name: 'Killing Intent', description: '+3 Attack, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 3 },
});
define({
  id: 'quick_steps', name: 'Quick Steps', description: '+1 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { initiative: 1 },
});
define({
  id: 'fleet_foot', name: 'Fleet Foot', description: '+2 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { initiative: 2 },
});
define({
  id: 'marathoner', name: 'Marathoner', description: '+3 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { initiative: 3 },
});
define({
  id: 'tough_skin', name: 'Tough Skin', description: '+20 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { maxHp: 20 },
});
define({
  id: 'giant_frame', name: 'Giant Frame', description: '+30 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { maxHp: 30 },
});
define({
  id: 'giant_heart', name: 'Giant Heart', description: '+40 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { maxHp: 40 },
});
define({
  id: 'battle_hardened', name: 'Battle Hardened', description: '+1 Attack, +1 Defense, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { attack: 1, defense: 1 },
});
define({
  id: 'seasoned', name: 'Seasoned', description: '+1 Attack, +1 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { attack: 1, initiative: 1 },
});
define({
  id: 'nimble', name: 'Nimble', description: '+1 Initiative, +1 Defense, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { initiative: 1, defense: 1 },
});
define({
  id: 'sturdy', name: 'Sturdy', description: '+1 Defense, +15 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', statBonus: { defense: 1, maxHp: 15 },
});
define({
  id: 'bruiser', name: 'Bruiser', description: '+2 Attack, +10 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 2, maxHp: 10 },
});
define({
  id: 'assassin', name: 'Assassin', description: '+2 Attack, +1 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 2, initiative: 1 },
});
define({
  id: 'guardian', name: 'Guardian', description: '+2 Defense, +1 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { defense: 2, initiative: 1 },
});
define({
  id: 'juggernaut', name: 'Juggernaut', description: '+3 Defense, +10 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { defense: 3, maxHp: 10 },
});
define({
  id: 'colossus_frame', name: 'Colossus Frame', description: '+2 Defense, +25 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { defense: 2, maxHp: 25 },
});
define({
  id: 'warmonger', name: 'Warmonger', description: '+3 Attack, +10 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 3, maxHp: 10 },
});
define({
  id: 'retaliation', name: 'Retaliation', description: 'Counter 8 damage whenever you are attacked.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', effects: [{ kind: 'counter', amount: 8, duration: 0 }],
});
define({
  id: 'greater_counter', name: 'Greater Counter', description: 'Counter 18 damage whenever you are attacked.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', effects: [{ kind: 'counter', amount: 18, duration: 0 }],
});
define({
  id: 'reflect', name: 'Reflect', description: 'Attackers take 15 damage when they hit you.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', effects: [{ kind: 'thorns', amount: 15, duration: 0 }],
});
define({
  id: 'great_thorns', name: 'Great Thorns', description: 'Attackers take 22 damage when they hit you.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', effects: [{ kind: 'thorns', amount: 22, duration: 0 }],
});
define({
  id: 'eternal_flame', name: 'Eternal Flame', description: '+10% Attack, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', effects: [{ kind: 'attack_up', amount: 0.1, duration: 0 }],
});
define({
  id: 'warcry', name: 'Warcry', description: '+20% Attack, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', effects: [{ kind: 'attack_up', amount: 0.2, duration: 0 }],
});
define({
  id: 'granite', name: 'Granite', description: '+15% Defense, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', effects: [{ kind: 'defense_up', amount: 0.15, duration: 0 }],
});
define({
  id: 'adamant', name: 'Adamant', description: '+25% Defense, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', effects: [{ kind: 'defense_up', amount: 0.25, duration: 0 }],
});
define({
  id: 'adrenaline_passive', name: 'Adrenaline Rush', description: '+15% Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', effects: [{ kind: 'haste', amount: 0.15, duration: 0 }],
});
define({
  id: 'swiftness', name: 'Swiftness', description: '+30% Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', effects: [{ kind: 'haste', amount: 0.3, duration: 0 }],
});
define({
  id: 'second_wind_passive', name: 'Second Wind', description: 'Regenerate 6 HP per turn, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.common, rarity: 'common',
  targetRule: 'none', effects: [{ kind: 'regen', amount: 6, duration: 0 }],
});
define({
  id: 'disciplined', name: 'Disciplined', description: 'Regenerate 14 HP per turn, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', effects: [{ kind: 'regen', amount: 14, duration: 0 }],
});
define({
  id: 'focused', name: 'Focused', description: '+1 Attack, +2 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 1, initiative: 2 },
});
define({
  id: 'predator', name: 'Predator', description: '+2 Attack, +2 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { attack: 2, initiative: 2 },
});
define({
  id: 'wall', name: 'Wall', description: '+2 Defense, +20 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { defense: 2, maxHp: 20 },
});
define({
  id: 'savior', name: 'Savior', description: '+2 Defense, +15 HP, +1 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { defense: 2, maxHp: 15, initiative: 1 },
});
define({
  id: 'berserker_passive', name: 'Berserker Heart', description: '+3 Attack, +20 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { attack: 3, maxHp: 20 },
});
define({
  id: 'sentinel', name: 'Sentinel', description: '+3 Defense, +2 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { defense: 3, initiative: 2 },
});
define({
  id: 'overdrive', name: 'Overdrive', description: '+2 Attack, +2 Defense, +1 Initiative, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { attack: 2, defense: 2, initiative: 1 },
});

define({
  id: 'thorn_skin', name: 'Thorn Skin', description: '+2 Defense, and attackers take 5 damage, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { defense: 2 },
  effects: [{ kind: 'thorns', amount: 5, duration: 0 }],
});
define({
  id: 'bloodlust', name: 'Bloodlust', description: '+2 Attack, +10 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { attack: 2, maxHp: 10 },
});
define({
  id: 'vanguard', name: 'Vanguard', description: '+2 Defense, +1 Attack, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.uncommon, rarity: 'uncommon',
  targetRule: 'none', statBonus: { defense: 2, attack: 1 },
});
define({
  id: 'tempest_heart', name: 'Tempest Heart', description: '+2 Initiative, +1 Attack, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.rare, rarity: 'rare',
  targetRule: 'none', statBonus: { initiative: 2, attack: 1 },
});
define({
  id: 'unyielding', name: 'Unyielding', description: '+3 Defense, +10 HP, always.',
  kind: 'power', powerKind: 'passive', slot: 'passive1', price: PRICE.epic, rarity: 'epic',
  targetRule: 'none', statBonus: { defense: 3, maxHp: 10 },
});

// ------------------------------------------------------------
// ULTIMATES — 50
// ------------------------------------------------------------
define({
  id: 'inferno', name: 'Inferno', description: 'Unleash 70 base damage plus your Attack on ALL enemies.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 70, targetRule: 'all-enemies', damageType: 'fire', aiPriority: 10,
});
define({
  id: 'iron_bulwark', name: 'Iron Bulwark', description: 'Gain a 60-damage shield and +40% Defense for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'self',
  selfEffects: [
    { kind: 'shield', amount: 60, duration: 0 },
    { kind: 'defense_up', amount: 0.4, duration: 2 },
  ], aiPriority: 2,
});
define({
  id: 'mass_renewal', name: 'Mass Renewal', description: 'Heal ALL allies for 40 HP.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  healAmount: 40, targetRule: 'all-allies', aiPriority: 9,
});
define({
  id: 'overclock', name: 'Overclock', description: 'Reset ALL of your ability uses. Fire everything again.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'self', resetUses: true, aiPriority: 1,
});
define({
  id: 'annihilation', name: 'Annihilation', description: '90 base damage plus your Attack to ALL enemies.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 90, targetRule: 'all-enemies', aiPriority: 10,
});
define({
  id: 'meteor_shower', name: 'Meteor Shower', description: '75 base damage plus your Attack to ALL enemies, burning them.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 75, targetRule: 'all-enemies', damageType: 'fire',
  effects: [{ kind: 'burn', amount: 8, duration: 2 }], aiPriority: 10,
});
define({
  id: 'storm_of_blades', name: 'Storm of Blades', description: '85 base damage plus your Attack to ALL enemies.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 85, targetRule: 'all-enemies', aiPriority: 10,
});
define({
  id: 'divine_judgment', name: 'Divine Judgment', description: '80 base damage plus your Attack to ALL enemies, stunning them.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 80, targetRule: 'all-enemies', damageType: 'holy',
  effects: [{ kind: 'stun', amount: 1, duration: 1 }], aiPriority: 10,
});
define({
  id: 'void_eruption', name: 'Void Eruption', description: '70 base damage plus your Attack to ALL enemies, weakening them.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 70, targetRule: 'all-enemies',
  effects: [{ kind: 'attack_down', amount: 0.3, duration: 2 }], aiPriority: 10,
});
define({
  id: 'cataclysm', name: 'Cataclysm', description: '95 base damage plus your Attack to ALL enemies.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 95, targetRule: 'all-enemies', damageType: 'fire', aiPriority: 10,
});
define({
  id: 'time_warp', name: 'Time Warp', description: 'All allies gain +50% Initiative for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'all-allies',
  effects: [{ kind: 'haste', amount: 0.5, duration: 2 }], aiPriority: 2,
});
define({
  id: 'mass_barrier', name: 'Mass Barrier', description: 'ALL allies gain a 50-damage shield.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'all-allies',
  effects: [{ kind: 'shield', amount: 50, duration: 0 }], aiPriority: 4,
});
define({
  id: 'rallying_cry', name: 'Rallying Cry', description: 'All allies gain +40% Attack for 3 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'all-allies',
  effects: [{ kind: 'attack_up', amount: 0.4, duration: 3 }], aiPriority: 3,
});
define({
  id: 'mass_regeneration', name: 'Mass Regeneration', description: 'ALL allies regenerate 15 HP per turn for 3 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'all-allies',
  effects: [{ kind: 'regen', amount: 15, duration: 3 }], aiPriority: 8,
});
define({
  id: 'singularity', name: 'Singularity', description: '60 base damage plus your Attack to ALL enemies, slowing them.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 60, targetRule: 'all-enemies',
  effects: [{ kind: 'slow', amount: 0.4, duration: 2 }], aiPriority: 10,
});
define({
  id: 'black_hole', name: 'Black Hole', description: '65 base damage plus your Attack to ALL enemies, stunning them.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 65, targetRule: 'all-enemies',
  effects: [{ kind: 'stun', amount: 1, duration: 1 }], aiPriority: 10,
});
define({
  id: 'supernova', name: 'Supernova', description: '85 base damage plus your Attack to ALL enemies, burning them.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 85, targetRule: 'all-enemies', damageType: 'fire',
  effects: [{ kind: 'burn', amount: 10, duration: 2 }], aiPriority: 10,
});
define({
  id: 'colossal_slam', name: 'Colossal Slam', description: '100 base damage plus your Attack to one enemy.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 100, targetRule: 'enemy', aiPriority: 10,
});
define({
  id: 'overwhelming_light', name: 'Overwhelming Light', description: '75 base damage plus your Attack to one enemy, stunning it.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 75, targetRule: 'enemy', damageType: 'holy',
  effects: [{ kind: 'stun', amount: 1, duration: 1 }], aiPriority: 10,
});
define({
  id: 'soul_harvest', name: 'Soul Harvest', description: '55 base damage plus your Attack to ALL enemies, healing for 50% dealt.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 55, targetRule: 'all-enemies',
  lifesteal: 0.5, aiPriority: 10,
});
define({
  id: 'global_mend', name: 'Global Mend', description: 'Heal ALL allies for 80 HP.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  healAmount: 80, targetRule: 'all-allies', aiPriority: 9,
});
define({
  id: 'second_chance', name: 'Second Chance', description: 'Restore 120 HP to yourself and gain a 40-damage shield.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  healAmount: 120, targetRule: 'self',
  selfEffects: [{ kind: 'shield', amount: 40, duration: 0 }], aiPriority: 9,
});
define({
  id: 'titan_wall', name: 'Titan Wall', description: 'Gain a 100-damage shield.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'self',
  selfEffects: [{ kind: 'shield', amount: 100, duration: 0 }], aiPriority: 2,
});
define({
  id: 'frenzy', name: 'Frenzy', description: '+80% Attack but -25% Defense for 3 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'self',
  selfEffects: [
    { kind: 'attack_up', amount: 0.8, duration: 3 },
    { kind: 'defense_down', amount: 0.25, duration: 3 },
  ], aiPriority: 3,
});
define({
  id: 'blinding_light', name: 'Blinding Light', description: 'ALL enemies lose 50% Attack for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'all-enemies',
  effects: [{ kind: 'attack_down', amount: 0.5, duration: 2 }], aiPriority: 4,
});
define({
  id: 'shatter_armor', name: 'Shatter Armor', description: 'ALL enemies lose 50% Defense for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'all-enemies',
  effects: [{ kind: 'defense_down', amount: 0.5, duration: 2 }], aiPriority: 4,
});
define({
  id: 'total_slow', name: 'Temporal Freeze', description: 'ALL enemies are slowed by 60% for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'all-enemies',
  effects: [{ kind: 'slow', amount: 0.6, duration: 2 }], aiPriority: 4,
});
define({
  id: 'supercharge', name: 'Supercharge', description: 'Instantly charge your ultimate and gain +30% Attack for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'self',
  selfEffects: [{ kind: 'attack_up', amount: 0.3, duration: 2 }], aiPriority: 1,
});
define({
  id: 'arcane_overload', name: 'Arcane Overload', description: 'Reset ALL ability uses and gain a 40-damage shield.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'self', resetUses: true,
  selfEffects: [{ kind: 'shield', amount: 40, duration: 0 }], aiPriority: 1,
});
define({
  id: 'thunderstorm', name: 'Thunderstorm', description: '80 base damage plus your Attack to ALL enemies.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 80, targetRule: 'all-enemies', damageType: 'lightning', aiPriority: 10,
});
define({
  id: 'ice_age', name: 'Ice Age', description: '60 base damage plus your Attack to ALL enemies, stunning them.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 60, targetRule: 'all-enemies',
  effects: [{ kind: 'stun', amount: 1, duration: 1 }], aiPriority: 10,
});
define({
  id: 'plague_cloud', name: 'Plague Cloud', description: '35 base damage plus your Attack to ALL enemies, then 8 poison per turn.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 35, targetRule: 'all-enemies', damageType: 'poison',
  effects: [{ kind: 'poison', amount: 8, duration: 3 }], aiPriority: 10,
});
define({
  id: 'vampire_swarm', name: 'Vampire Swarm', description: '45 base damage plus your Attack to ALL enemies, healing for 70% dealt.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 45, targetRule: 'all-enemies',
  lifesteal: 0.7, aiPriority: 10,
});
define({
  id: 'final_judgment', name: 'Final Judgment', description: '90 base damage plus your Attack to one enemy, stunning it.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 90, targetRule: 'enemy', damageType: 'holy',
  effects: [{ kind: 'stun', amount: 1, duration: 1 }], aiPriority: 10,
});
define({
  id: 'mass_recovery', name: 'Mass Recovery', description: 'Heal ALL allies for 60 HP and regenerate 10 per turn for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  healAmount: 60, targetRule: 'all-allies',
  effects: [{ kind: 'regen', amount: 10, duration: 2 }], aiPriority: 9,
});
define({
  id: 'bulwark_of_faith', name: 'Bulwark of Faith', description: 'Gain a 80-damage shield and +60% Defense for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'self',
  selfEffects: [
    { kind: 'shield', amount: 80, duration: 0 },
    { kind: 'defense_up', amount: 0.6, duration: 2 },
  ], aiPriority: 2,
});
define({
  id: 'avalanche', name: 'Avalanche', description: '70 base damage plus your Attack to ALL enemies and slow them.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 70, targetRule: 'all-enemies',
  effects: [{ kind: 'slow', amount: 0.5, duration: 2 }], aiPriority: 10,
});
define({
  id: 'solar_flare', name: 'Solar Flare', description: '85 base damage plus your Attack to ALL enemies, burning them hard.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 85, targetRule: 'all-enemies', damageType: 'fire',
  effects: [{ kind: 'burn', amount: 12, duration: 2 }], aiPriority: 10,
});
define({
  id: 'oblivion', name: 'Oblivion', description: '95 base damage plus your Attack to one enemy.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 95, targetRule: 'enemy', aiPriority: 10,
});
define({
  id: 'empower', name: 'Empower', description: '+50% Attack and +50% Defense for 3 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'self',
  selfEffects: [
    { kind: 'attack_up', amount: 0.5, duration: 3 },
    { kind: 'defense_up', amount: 0.5, duration: 3 },
  ], aiPriority: 3,
});
define({
  id: 'army_regen', name: 'Army Regen', description: 'ALL allies regenerate 25 HP per turn for 3 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'all-allies',
  effects: [{ kind: 'regen', amount: 25, duration: 3 }], aiPriority: 8,
});
define({
  id: 'ultimate_heal', name: 'Ultimate Heal', description: 'Restore 100 HP to yourself and regenerate 15 per turn for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  healAmount: 100, targetRule: 'self',
  selfEffects: [{ kind: 'regen', amount: 15, duration: 2 }], aiPriority: 9,
});
define({
  id: 'all_clear', name: 'All Clear', description: 'Heal ALL allies for 50 HP and shield them for 30.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  healAmount: 50, targetRule: 'all-allies',
  effects: [{ kind: 'shield', amount: 30, duration: 0 }], aiPriority: 9,
});
define({
  id: 'total_darkness', name: 'Total Darkness', description: 'ALL enemies lose 40% Attack and 40% Defense for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'all-enemies',
  effects: [
    { kind: 'attack_down', amount: 0.4, duration: 2 },
    { kind: 'defense_down', amount: 0.4, duration: 2 },
  ], aiPriority: 4,
});
define({
  id: 'banner', name: 'Battle Banner', description: 'All allies gain +30% Attack and +30% Defense for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'all-allies',
  effects: [
    { kind: 'attack_up', amount: 0.3, duration: 2 },
    { kind: 'defense_up', amount: 0.3, duration: 2 },
  ], aiPriority: 3,
});
define({
  id: 'great_heal', name: 'Great Heal', description: 'Restore 150 HP to yourself.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  healAmount: 150, targetRule: 'self', aiPriority: 9,
});
define({
  id: 'god_mode', name: 'God Mode', description: 'Gain a 120-damage shield and +80% Defense for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  targetRule: 'self',
  selfEffects: [
    { kind: 'shield', amount: 120, duration: 0 },
    { kind: 'defense_up', amount: 0.8, duration: 2 },
  ], aiPriority: 2,
});
define({
  id: 'armageddon', name: 'Armageddon', description: '110 base damage plus your Attack to ALL enemies.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 110, targetRule: 'all-enemies', damageType: 'fire', aiPriority: 10,
});
define({
  id: 'rebirth', name: 'Rebirth', description: 'Restore 200 HP to yourself and gain +50% Attack for 2 turns.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  healAmount: 200, targetRule: 'self',
  selfEffects: [{ kind: 'attack_up', amount: 0.5, duration: 2 }], aiPriority: 9,
});

define({
  id: 'rapture', name: 'Rapture', description: '65 base damage plus your Attack to ALL enemies, burning them hard.',
  kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: PRICE.epic, rarity: 'epic',
  attack: 65, targetRule: 'all-enemies', damageType: 'fire',
  effects: [{ kind: 'burn', amount: 8, duration: 3 }], aiPriority: 10,
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
