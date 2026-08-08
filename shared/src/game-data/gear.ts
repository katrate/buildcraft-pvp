import type { GearDefinition, Rarity } from '../types';

// All gear in V1. Data-driven — append here to add content.
//
// Economy rule (V1): EVERY purchase costs >= MIN_PURCHASE (1000) so gear
// cannot be stacked after one or two matches. Prices scale by rarity:
// common 1000 · uncommon 1500 · rare 2000 · epic 2500.
//
// 50 items per category (weapon / armor / utility).

export const GEAR: Record<string, GearDefinition> = {};

const PRICE: Record<Rarity, number> = { common: 1000, uncommon: 1500, rare: 2000, epic: 2500 };

function define(g: GearDefinition) {
  GEAR[g.id] = g;
}

// ------------------------------------------------------------
// WEAPONS — 50
// ------------------------------------------------------------
define({
  id: 'iron_sword', name: 'Iron Sword', description: '+3 Attack. Reliable steel.',
  kind: 'gear', slot: 'weapon', price: PRICE.common, rarity: 'common',
  stats: { attack: 3 },
});
define({
  id: 'light_blade', name: 'Light Blade', description: '+2 Attack, +2 Initiative. Strike first.',
  kind: 'gear', slot: 'weapon', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { attack: 2, initiative: 2 },
});
define({
  id: 'war_hammer', name: 'War Hammer', description: '+5 Attack, -2 Initiative. Slow but devastating.',
  kind: 'gear', slot: 'weapon', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { attack: 5, initiative: -2 },
});
define({
  id: 'rusty_dagger', name: 'Rusty Dagger', description: '+1 Attack, +1 Initiative. A humble start.',
  kind: 'gear', slot: 'weapon', price: PRICE.common, rarity: 'common',
  stats: { attack: 1, initiative: 1 },
});
define({
  id: 'longsword', name: 'Longsword', description: '+4 Attack. Balanced and deadly.',
  kind: 'gear', slot: 'weapon', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { attack: 4 },
});
define({
  id: 'twin_blades', name: 'Twin Blades', description: '+3 Attack, +1 Initiative. Dance of steel.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 3, initiative: 1 },
});
define({
  id: 'greatsword', name: 'Greatsword', description: '+7 Attack, -3 Initiative. A door of steel.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 7, initiative: -3 },
});
define({
  id: 'battle_axe', name: 'Battle Axe', description: '+5 Attack, -1 Initiative. Chopping rhythm.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 5, initiative: -1 },
});
define({
  id: 'spear', name: 'Spear', description: '+3 Attack, +2 Initiative. Reach and speed.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 3, initiative: 2 },
});
define({
  id: 'dual_daggers', name: 'Dual Daggers', description: '+1 Attack, +4 Initiative. Blink and they bleed.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 1, initiative: 4 },
});
define({
  id: 'war_cleaver', name: 'War Cleaver', description: '+6 Attack, -2 Initiative. Heavy swings.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 6, initiative: -2 },
});
define({
  id: 'flame_sword', name: 'Flame Sword', description: '+4 Attack, +2 Initiative. Forged in fire.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 4, initiative: 2 },
});
define({
  id: 'frost_blade', name: 'Frost Blade', description: '+5 Attack, +1 Defense. Cold cuts deep.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 5, defense: 1 },
});
define({
  id: 'storm_hammer', name: 'Storm Hammer', description: '+6 Attack, +1 Initiative. Thunder in your hands.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 6, initiative: 1 },
});
define({
  id: 'shadow_scythe', name: 'Shadow Scythe', description: '+7 Attack, -1 Defense. Harvest in silence.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 7, defense: -1 },
});
define({
  id: 'holy_blade', name: 'Holy Blade', description: '+5 Attack, +2 Defense. Smite in the name of light.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 5, defense: 2 },
});
define({
  id: 'venom_fang', name: 'Venom Fang', description: '+4 Attack, +1 Initiative. One scratch is enough.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 4, initiative: 1 },
});
define({
  id: 'blood_cleaver', name: 'Blood Cleaver', description: '+6 Attack, +1 Defense. Thirsty steel.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 6, defense: 1 },
});
define({
  id: 'titan_hammer', name: 'Titan Hammer', description: '+9 Attack, -4 Initiative. Gods flinched.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 9, initiative: -4 },
});
define({
  id: 'phantom_dagger', name: 'Phantom Dagger', description: '+2 Attack, +5 Initiative. Never seen.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 2, initiative: 5 },
});
define({
  id: 'obsidian_blade', name: 'Obsidian Blade', description: '+6 Attack. Shatters armor on contact.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 6 },
});
define({
  id: 'crystal_sword', name: 'Crystal Sword', description: '+4 Attack, +1 Initiative, +10 HP. Sharp and sturdy.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 4, initiative: 1, maxHp: 10 },
});
define({
  id: 'rune_axe', name: 'Rune Axe', description: '+5 Attack, +1 Defense, +1 Initiative. Carved power.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 5, defense: 1, initiative: 1 },
});
define({
  id: 'serpent_whip', name: 'Serpent Whip', description: '+3 Attack, +3 Initiative. Strikes before the sound.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 3, initiative: 3 },
});
define({
  id: 'bone_club', name: 'Bone Club', description: '+5 Attack, +1 Defense. Crude but effective.',
  kind: 'gear', slot: 'weapon', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { attack: 5, defense: 1 },
});
define({
  id: 'flint_knife', name: 'Flint Knife', description: '+2 Attack, +2 Initiative. Primal edge.',
  kind: 'gear', slot: 'weapon', price: PRICE.common, rarity: 'common',
  stats: { attack: 2, initiative: 2 },
});
define({
  id: 'bronze_sword', name: 'Bronze Sword', description: '+2 Attack. An age of bronze.',
  kind: 'gear', slot: 'weapon', price: PRICE.common, rarity: 'common',
  stats: { attack: 2 },
});
define({
  id: 'steel_sabre', name: 'Steel Sabre', description: '+3 Attack, +1 Defense. Curved for war.',
  kind: 'gear', slot: 'weapon', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { attack: 3, defense: 1 },
});
define({
  id: 'khopesh', name: 'Khopesh', description: '+3 Attack, +2 Defense. Ancient and cruel.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 3, defense: 2 },
});
define({
  id: 'mace', name: 'Mace', description: '+4 Attack. No armor stops blunt force.',
  kind: 'gear', slot: 'weapon', price: PRICE.common, rarity: 'common',
  stats: { attack: 4 },
});
define({
  id: 'morning_star', name: 'Morning Star', description: '+5 Attack. Spiked and merciless.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 5 },
});
define({
  id: 'halberd', name: 'Halberd', description: '+4 Attack, +1 Defense. Reach with a hook.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 4, defense: 1 },
});
define({
  id: 'javelin', name: 'Javelin', description: '+3 Attack, +2 Initiative. Thrown lightning.',
  kind: 'gear', slot: 'weapon', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { attack: 3, initiative: 2 },
});
define({
  id: 'claws', name: 'Razor Claws', description: '+2 Attack, +3 Initiative. Unarmed became armed.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 2, initiative: 3 },
});
define({
  id: 'fist_wraps', name: 'Fist Wraps', description: '+1 Attack, +1 Defense, +1 Initiative. Everything counts.',
  kind: 'gear', slot: 'weapon', price: PRICE.common, rarity: 'common',
  stats: { attack: 1, defense: 1, initiative: 1 },
});
define({
  id: 'quarterstaff', name: 'Quarterstaff', description: '+3 Attack, +2 Defense. Calm and centered.',
  kind: 'gear', slot: 'weapon', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { attack: 3, defense: 2 },
});
define({
  id: 'war_fan', name: 'War Fan', description: '+2 Attack, +3 Initiative. Grace under pressure.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 2, initiative: 3 },
});
define({
  id: 'kusarigama', name: 'Kusarigama', description: '+4 Attack, +2 Initiative. Chain and sickle.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 4, initiative: 2 },
});
define({
  id: 'zweihander', name: 'Zweihander', description: '+8 Attack, -4 Initiative. Two hands of doom.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 8, initiative: -4 },
});
define({
  id: 'estoc', name: 'Estoc', description: '+4 Attack, +1 Initiative. Punctures plate.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 4, initiative: 1 },
});
define({
  id: 'gladius', name: 'Gladius', description: '+3 Attack, +1 Initiative, +1 Defense. Legion standard.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 3, initiative: 1, defense: 1 },
});
define({
  id: 'macuahuitl', name: 'Macuahuitl', description: '+4 Attack, +1 Defense. Obsidian teeth.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 4, defense: 1 },
});
define({
  id: 'fang_blade', name: 'Fang Blade', description: '+5 Attack, +1 Initiative. Predator\'s tooth.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 5, initiative: 1 },
});
define({
  id: 'sun_sword', name: 'Sun Sword', description: '+4 Attack, +2 Defense, +1 Initiative. Radiant steel.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 4, defense: 2, initiative: 1 },
});
define({
  id: 'moon_blade', name: 'Moon Blade', description: '+5 Attack, +3 Initiative. Cuts in moonlight.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 5, initiative: 3 },
});
define({
  id: 'star_spear', name: 'Star Spear', description: '+5 Attack, +2 Defense. A falling star held.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 5, defense: 2 },
});
define({
  id: 'doom_axe', name: 'Doom Axe', description: '+8 Attack, -2 Defense. Your doom, not mine.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 8, defense: -2 },
});
define({
  id: 'eternal_blade', name: 'Eternal Blade', description: '+6 Attack, +2 Initiative. It never dulls.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 6, initiative: 2 },
});

define({
  id: 'crystal_blade', name: 'Crystal Blade', description: '+6 Attack, +2 Initiative. Razor-sharp prism.',
  kind: 'gear', slot: 'weapon', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 6, initiative: 2 },
});
define({
  id: 'twin_fangs', name: 'Twin Fangs', description: '+5 Attack, +1 Initiative. Struck twice, felt twice.',
  kind: 'gear', slot: 'weapon', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 5, initiative: 1 },
});

// ------------------------------------------------------------
// ARMOR — 50
// ------------------------------------------------------------
define({
  id: 'leather_armor', name: 'Leather Armor', description: '+2 Defense. Light padding.',
  kind: 'gear', slot: 'armor', price: PRICE.common, rarity: 'common',
  stats: { defense: 2 },
});
define({
  id: 'light_armor', name: 'Light Armor', description: '+2 Defense, +2 Initiative.',
  kind: 'gear', slot: 'armor', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { defense: 2, initiative: 2 },
});
define({
  id: 'heavy_armor', name: 'Heavy Armor', description: '+4 Defense, +20 HP, -2 Initiative.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 4, maxHp: 20, initiative: -2 },
});
define({
  id: 'cloth_robe', name: 'Cloth Robe', description: '+1 Defense, +2 Initiative. Weave of speed.',
  kind: 'gear', slot: 'armor', price: PRICE.common, rarity: 'common',
  stats: { defense: 1, initiative: 2 },
});
define({
  id: 'hide_vest', name: 'Hide Vest', description: '+2 Defense, +10 HP. Raw animal resilience.',
  kind: 'gear', slot: 'armor', price: PRICE.common, rarity: 'common',
  stats: { defense: 2, maxHp: 10 },
});
define({
  id: 'chainmail', name: 'Chainmail', description: '+3 Defense. Rings of iron.',
  kind: 'gear', slot: 'armor', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { defense: 3 },
});
define({
  id: 'plate_armor', name: 'Plate Armor', description: '+5 Defense, -3 Initiative. Unstoppable wall.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 5, initiative: -3 },
});
define({
  id: 'scale_mail', name: 'Scale Mail', description: '+4 Defense, +1 Initiative. Scales of a dragon.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 4, initiative: 1 },
});
define({
  id: 'brigandine', name: 'Brigandine', description: '+3 Defense, +1 Initiative. Riveted and ready.',
  kind: 'gear', slot: 'armor', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { defense: 3, initiative: 1 },
});
define({
  id: 'gambeson', name: 'Gambeson', description: '+2 Defense, +15 HP. Padded layers.',
  kind: 'gear', slot: 'armor', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { defense: 2, maxHp: 15 },
});
define({
  id: 'battle_plate', name: 'Battle Plate', description: '+5 Defense, +10 HP. For the front line.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 5, maxHp: 10 },
});
define({
  id: 'dragon_scale', name: 'Dragon Scale', description: '+6 Defense, +20 HP. Shed by an elder.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 6, maxHp: 20 },
});
define({
  id: 'silver_mail', name: 'Silver Mail', description: '+4 Defense, +10 HP, +1 Initiative. Blessed metal.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 4, maxHp: 10, initiative: 1 },
});
define({
  id: 'obsidian_plate', name: 'Obsidian Plate', description: '+7 Defense, -2 Initiative. Darkness given form.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 7, initiative: -2 },
});
define({
  id: 'titan_armor', name: 'Titan Armor', description: '+6 Defense, +40 HP, -4 Initiative. A fortress wears this.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 6, maxHp: 40, initiative: -4 },
});
define({
  id: 'phantom_robes', name: 'Phantom Robes', description: '+2 Defense, +5 Initiative. Not there.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 2, initiative: 5 },
});
define({
  id: 'frost_armor', name: 'Frost Armor', description: '+5 Defense, +1 Initiative. Colder than winter.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 5, initiative: 1 },
});
define({
  id: 'flame_guard', name: 'Flame Guard', description: '+4 Defense, +20 HP. Fire cannot burn it.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 4, maxHp: 20 },
});
define({
  id: 'rune_plate', name: 'Rune Plate', description: '+5 Defense, +2 Initiative. Runed for war.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 5, initiative: 2 },
});
define({
  id: 'bone_armor', name: 'Bone Armor', description: '+3 Defense, +25 HP. Woven from the fallen.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 3, maxHp: 25 },
});
define({
  id: 'spiked_armor', name: 'Spiked Armor', description: '+3 Defense. Attackers feel it.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 3 },
  effects: [{ kind: 'thorns', amount: 6, duration: 0 }],
});
define({
  id: 'warden_plate', name: 'Warden Plate', description: '+4 Defense, +1 Initiative. The gate stands.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 4, initiative: 1 },
});
define({
  id: 'crusader_armor', name: 'Crusader Armor', description: '+5 Defense, +1 Initiative. Faith is armor.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 5, initiative: 1 },
});
define({
  id: 'assassin_garb', name: 'Assassin Garb', description: '+1 Defense, +5 Initiative. Silent steps.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 1, initiative: 5 },
});
define({
  id: 'guardian_vest', name: 'Guardian Vest', description: '+4 Defense, +15 HP. Protects the one behind.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 4, maxHp: 15 },
});
define({
  id: 'berserker_hide', name: 'Berserker Hide', description: '+2 Defense, +15 HP, +1 Initiative. Bare chest courage.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 2, maxHp: 15, initiative: 1 },
});
define({
  id: 'scholar_robes', name: 'Scholar Robes', description: '+1 Defense, +3 Initiative, +10 HP. Knowledge protects.',
  kind: 'gear', slot: 'armor', price: PRICE.common, rarity: 'common',
  stats: { defense: 1, initiative: 3, maxHp: 10 },
});
define({
  id: 'hunter_garb', name: 'Hunter Garb', description: '+2 Defense, +2 Initiative. Camouflage and speed.',
  kind: 'gear', slot: 'armor', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { defense: 2, initiative: 2 },
});
define({
  id: 'wolf_pelt', name: 'Wolf Pelt', description: '+3 Defense, +10 HP. The pack protects.',
  kind: 'gear', slot: 'armor', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { defense: 3, maxHp: 10 },
});
define({
  id: 'iron_mail', name: 'Iron Mail', description: '+4 Defense, +5 HP. Sturdy and simple.',
  kind: 'gear', slot: 'armor', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { defense: 4, maxHp: 5 },
});
define({
  id: 'stone_plate', name: 'Stone Plate', description: '+5 Defense, -2 Initiative. Immovable.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 5, initiative: -2 },
});
define({
  id: 'shadow_weave', name: 'Shadow Weave', description: '+2 Defense, +4 Initiative. Woven from darkness.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 2, initiative: 4 },
});
define({
  id: 'holy_armor', name: 'Holy Armor', description: '+5 Defense, +1 Initiative. Hallowed steel.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 5, initiative: 1 },
});
define({
  id: 'abyss_armor', name: 'Abyss Armor', description: '+4 Defense, +30 HP. Swallowed by the dark.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 4, maxHp: 30 },
});
define({
  id: 'solar_plate', name: 'Solar Plate', description: '+4 Defense, +2 Initiative, +10 HP. Blazing defense.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 4, initiative: 2, maxHp: 10 },
});
define({
  id: 'nebula_cloak', name: 'Nebula Cloak', description: '+3 Defense, +4 Initiative. Woven from stars.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 3, initiative: 4 },
});
define({
  id: 'juggernaut_armor', name: 'Juggernaut Armor', description: '+7 Defense, +25 HP, -4 Initiative. Nothing moves it.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 7, maxHp: 25, initiative: -4 },
});
define({
  id: 'sentinel_plate', name: 'Sentinel Plate', description: '+5 Defense, +20 HP. It never sleeps.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 5, maxHp: 20 },
});
define({
  id: 'arcane_robes', name: 'Arcane Robes', description: '+2 Defense, +3 Initiative, +15 HP. Threads of mana.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 2, initiative: 3, maxHp: 15 },
});
define({
  id: 'ghost_armor', name: 'Ghost Armor', description: '+2 Defense, +6 Initiative. Through walls.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 2, initiative: 6 },
});
define({
  id: 'ironhide_vest', name: 'Ironhide Vest', description: '+4 Defense, +10 HP. Toughened skin.',
  kind: 'gear', slot: 'armor', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { defense: 4, maxHp: 10 },
});
define({
  id: 'war_plate', name: 'War Plate', description: '+5 Defense, +1 Initiative. Made for battle.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 5, initiative: 1 },
});
define({
  id: 'bark_armor', name: 'Bark Armor', description: '+3 Defense, +20 HP. Nature\'s guard.',
  kind: 'gear', slot: 'armor', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { defense: 3, maxHp: 20 },
});
define({
  id: 'coral_mail', name: 'Coral Mail', description: '+3 Defense, +15 HP, +1 Initiative. From the deep.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 3, maxHp: 15, initiative: 1 },
});
define({
  id: 'adamant_armor', name: 'Adamant Armor', description: '+8 Defense, -4 Initiative. The hardest metal.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 8, initiative: -4 },
});
define({
  id: 'void_plate', name: 'Void Plate', description: '+4 Defense, +30 HP, +1 Initiative. Eats the light.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 4, maxHp: 30, initiative: 1 },
});
define({
  id: 'colossus_armor', name: 'Colossus Armor', description: '+6 Defense, +30 HP, -2 Initiative. Towering defense.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 6, maxHp: 30, initiative: -2 },
});

define({
  id: 'ebon_plate', name: 'Ebon Plate', description: '+5 Defense, +20 HP. Black glass, unbreakable.',
  kind: 'gear', slot: 'armor', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 5, maxHp: 20 },
});
define({
  id: 'chain_mail', name: 'Chain Mail', description: '+4 Defense, +10 HP. Tried and tested.',
  kind: 'gear', slot: 'armor', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { defense: 4, maxHp: 10 },
});
define({
  id: 'warden_robe', name: 'Warden Robe', description: '+3 Defense, +25 HP. The wardens never fall.',
  kind: 'gear', slot: 'armor', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 3, maxHp: 25 },
});

// ------------------------------------------------------------
// UTILITY — 50
// ------------------------------------------------------------
define({
  id: 'energy_core', name: 'Energy Core', description: '+1 extra use for every equipped active power.',
  kind: 'gear', slot: 'utility', price: PRICE.common, rarity: 'common',
  stats: {},
  bonusAbilityUses: 1,
});
define({
  id: 'speed_module', name: 'Speed Module', description: '+3 Initiative.',
  kind: 'gear', slot: 'utility', price: PRICE.common, rarity: 'common',
  stats: { initiative: 3 },
});
define({
  id: 'life_amulet', name: 'Life Amulet', description: '+25 Max HP.',
  kind: 'gear', slot: 'utility', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { maxHp: 25 },
});
define({
  id: 'reactive_shield', name: 'Reactive Shield', description: 'Start each fight with a 30-damage shield.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: {},
  effects: [{ kind: 'shield', amount: 30, duration: 0 }],
});
define({
  id: 'war_banner', name: 'War Banner', description: '+1 Attack, +1 Initiative. Lead from the front.',
  kind: 'gear', slot: 'utility', price: PRICE.common, rarity: 'common',
  stats: { attack: 1, initiative: 1 },
});
define({
  id: 'travel_boots', name: 'Travel Boots', description: '+2 Initiative. Well-worn and fast.',
  kind: 'gear', slot: 'utility', price: PRICE.common, rarity: 'common',
  stats: { initiative: 2 },
});
define({
  id: 'wind_boots', name: 'Wind Boots', description: '+4 Initiative. Run on the breeze.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { initiative: 4 },
});
define({
  id: 'aegis_shield', name: 'Aegis Shield', description: '+3 Defense. Carry your own wall.',
  kind: 'gear', slot: 'utility', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { defense: 3 },
});
define({
  id: 'power_gauntlet', name: 'Power Gauntlet', description: '+2 Attack. Punch harder.',
  kind: 'gear', slot: 'utility', price: PRICE.common, rarity: 'common',
  stats: { attack: 2 },
});
define({
  id: 'war_drums', name: 'War Drums', description: '+1 extra use for every equipped active power.',
  kind: 'gear', slot: 'utility', price: PRICE.uncommon, rarity: 'uncommon',
  stats: {},
  bonusAbilityUses: 1,
});
define({
  id: 'second_wind_totem', name: 'Second Wind Totem', description: 'Regenerate 5 HP at the start of each of your turns.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: {},
  effects: [{ kind: 'regen', amount: 5, duration: 0 }],
});
define({
  id: 'reflect_orb', name: 'Reflect Orb', description: 'Attackers take 6 damage when they hit you.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: {},
  effects: [{ kind: 'thorns', amount: 6, duration: 0 }],
});
define({
  id: 'counter_ring', name: 'Counter Ring', description: 'Retaliate for 8 damage when attacked.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: {},
  effects: [{ kind: 'counter', amount: 8, duration: 0 }],
});
define({
  id: 'iron_heart', name: 'Iron Heart', description: '+40 Max HP.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { maxHp: 40 },
});
define({
  id: 'golem_heart', name: 'Golem Heart', description: '+60 Max HP.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: { maxHp: 60 },
});
define({
  id: 'titan_emblem', name: 'Titan Emblem', description: '+3 Attack, +10 HP.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 3, maxHp: 10 },
});
define({
  id: 'warlord_emblem', name: 'Warlord Emblem', description: '+2 Attack, +2 Defense.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 2, defense: 2 },
});
define({
  id: 'archmage_core', name: 'Archmage Core', description: '+2 extra uses for every equipped active power.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: {},
  bonusAbilityUses: 2,
});
define({
  id: 'potion_belt', name: 'Potion Belt', description: '+1 extra use for every equipped active power.',
  kind: 'gear', slot: 'utility', price: PRICE.common, rarity: 'common',
  stats: {},
  bonusAbilityUses: 1,
});
define({
  id: 'scout_lens', name: 'Scout Lens', description: '+1 Attack, +2 Initiative. See everything.',
  kind: 'gear', slot: 'utility', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { attack: 1, initiative: 2 },
});
define({
  id: 'guardian_emblem', name: 'Guardian Emblem', description: '+2 Defense, +15 HP.',
  kind: 'gear', slot: 'utility', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { defense: 2, maxHp: 15 },
});
define({
  id: 'berserker_charm', name: 'Berserker Charm', description: '+2 Attack, +1 Initiative.',
  kind: 'gear', slot: 'utility', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { attack: 2, initiative: 1 },
});
define({
  id: 'wolf_totem', name: 'Wolf Totem', description: '+2 Attack, +10 HP.',
  kind: 'gear', slot: 'utility', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { attack: 2, maxHp: 10 },
});
define({
  id: 'bear_totem', name: 'Bear Totem', description: '+2 Defense, +20 HP.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 2, maxHp: 20 },
});
define({
  id: 'eagle_totem', name: 'Eagle Totem', description: '+2 Initiative, +10 HP. High and mighty.',
  kind: 'gear', slot: 'utility', price: PRICE.common, rarity: 'common',
  stats: { initiative: 2, maxHp: 10 },
});
define({
  id: 'phoenix_feather', name: 'Phoenix Feather', description: '+1 Attack, +20 HP. Warm rebirth.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 1, maxHp: 20 },
});
define({
  id: 'dragon_scale_trinket', name: 'Dragon Scale Trinket', description: '+3 Defense, +1 Initiative. Shed scales.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 3, initiative: 1 },
});
define({
  id: 'dragon_eye', name: 'Dragon Eye', description: '+3 Attack, +1 Defense. It sees everything.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 3, defense: 1 },
});
define({
  id: 'moonstone', name: 'Moonstone', description: '+2 Defense, +2 Initiative. Pale and calm.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 2, initiative: 2 },
});
define({
  id: 'sunstone', name: 'Sunstone', description: '+2 Attack, +2 Initiative. Warm to the touch.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 2, initiative: 2 },
});
define({
  id: 'star_compass', name: 'Star Compass', description: '+1 Attack, +1 Defense, +1 Initiative. Always knows north.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 1, defense: 1, initiative: 1 },
});
define({
  id: 'void_shard', name: 'Void Shard', description: '+3 Attack, +1 Initiative. Cuts through worlds.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 3, initiative: 1 },
});
define({
  id: 'abyss_pearl', name: 'Abyss Pearl', description: '+2 Defense, +30 HP. From the crushing deep.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: { defense: 2, maxHp: 30 },
});
define({
  id: 'bloodstone', name: 'Bloodstone', description: '+2 Attack, +15 HP. It remembers the slain.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 2, maxHp: 15 },
});
define({
  id: 'ice_heart', name: 'Ice Heart', description: '+3 Defense, +2 Initiative. Frozen solid.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 3, initiative: 2 },
});
define({
  id: 'ember_heart', name: 'Ember Heart', description: '+2 Attack, +2 Defense. Burns within.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 2, defense: 2 },
});
define({
  id: 'storm_eye', name: 'Storm Eye', description: '+1 Attack, +3 Initiative. The calm center.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 1, initiative: 3 },
});
define({
  id: 'shadow_amulet', name: 'Shadow Amulet', description: '+2 Attack, +2 Initiative. Invisible weight.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 2, initiative: 2 },
});
define({
  id: 'holy_relic', name: 'Holy Relic', description: '+2 Defense, +2 Initiative. Faith protects.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 2, initiative: 2 },
});
define({
  id: 'cursed_totem', name: 'Cursed Totem', description: '+3 Attack, +2 Defense. Power has a price.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 3, defense: 2 },
});
define({
  id: 'giant_emblem', name: 'Giant Emblem', description: '+1 Defense, +30 HP. Make room.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { defense: 1, maxHp: 30 },
});
define({
  id: 'swift_emblem', name: 'Swift Emblem', description: '+4 Initiative. Nobody catches you.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: { initiative: 4 },
});
define({
  id: 'battle_emblem', name: 'Battle Emblem', description: '+2 Attack, +2 Initiative. Forged for glory.',
  kind: 'gear', slot: 'utility', price: PRICE.rare, rarity: 'rare',
  stats: { attack: 2, initiative: 2 },
});
define({
  id: 'turtle_shield', name: 'Turtle Shield', description: 'Start each fight with a 20-damage shield.',
  kind: 'gear', slot: 'utility', price: PRICE.common, rarity: 'common',
  stats: {},
  effects: [{ kind: 'shield', amount: 20, duration: 0 }],
});
define({
  id: 'fortress_gem', name: 'Fortress Gem', description: 'Start each fight with a 50-damage shield.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: {},
  effects: [{ kind: 'shield', amount: 50, duration: 0 }],
});
define({
  id: 'regen_crystal', name: 'Regen Crystal', description: 'Regenerate 8 HP at the start of each of your turns.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: {},
  effects: [{ kind: 'regen', amount: 8, duration: 0 }],
});
define({
  id: 'thorn_bracelet', name: 'Thorn Bracelet', description: 'Attackers take 10 damage when they hit you.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: {},
  effects: [{ kind: 'thorns', amount: 10, duration: 0 }],
});
define({
  id: 'counter_emblem', name: 'Counter Emblem', description: 'Retaliate for 12 damage when attacked.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: {},
  effects: [{ kind: 'counter', amount: 12, duration: 0 }],
});
define({
  id: 'hybrid_core', name: 'Hybrid Core', description: '+1 Attack, +1 Defense, +1 Initiative.',
  kind: 'gear', slot: 'utility', price: PRICE.uncommon, rarity: 'uncommon',
  stats: { attack: 1, defense: 1, initiative: 1 },
});
define({
  id: 'duel_bracelet', name: 'Duel Bracelet', description: '+2 Attack, +1 Defense, +1 Initiative. For the 1v1.',
  kind: 'gear', slot: 'utility', price: PRICE.epic, rarity: 'epic',
  stats: { attack: 2, defense: 1, initiative: 1 },
});

export function getGear(id: string | null | undefined): GearDefinition | null {
  return id ? GEAR[id] ?? null : null;
}

export function getAllGear(): GearDefinition[] {
  return Object.values(GEAR);
}
