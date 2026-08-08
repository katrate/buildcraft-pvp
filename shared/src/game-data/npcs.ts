import type { Preset } from '../types';

// ------------------------------------------------------------
// NPC templates. Practice mode fights a single template at base stats
// (see engine/practice.ts); PvP bot presets fill matchmaking teams.
// ------------------------------------------------------------
export interface NpcTemplate {
  id: string;
  name: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond';
  color: string;
  preset: Preset; // slots reference shared power/gear ids
}

export const NPC_TEMPLATES: Record<string, NpcTemplate> = {
  squire: {
    id: 'squire', name: 'Squire', shape: 'square', color: '#9aa5b1',
    preset: {
      id: 'npc_squire', name: 'Squire', createdAt: 0,
      slots: { core: 'stone_core', active1: 'fire_bolt', active2: null, passive1: 'counter', passive2: null, weapon: 'iron_sword', armor: 'leather_armor', utility: null, ultimate: null },
    },
  },
  raider: {
    id: 'raider', name: 'Raider', shape: 'triangle', color: '#e05d5d',
    preset: {
      id: 'npc_raider', name: 'Raider', createdAt: 0,
      slots: { core: 'flame_core', active1: 'vampiric_strike', active2: 'fire_bolt', passive1: 'swift', passive2: null, weapon: 'light_blade', armor: 'light_armor', utility: 'speed_module', ultimate: null },
    },
  },
  brute: {
    id: 'brute', name: 'Brute', shape: 'diamond', color: '#b8874f',
    preset: {
      id: 'npc_brute', name: 'Brute', createdAt: 0,
      slots: { core: 'stone_core', active1: 'berserk', active2: 'shield', passive1: 'thorns', passive2: 'vitality', weapon: 'war_hammer', armor: 'heavy_armor', utility: 'life_amulet', ultimate: null },
    },
  },
  // The PRACTICE NPC (see engine/practice.ts PRACTICE_NPC_ID). Tuned to the
  // new damage scale as a fair starter-underdog: it fights at BASE stats with
  // only a fire bolt (no gear, no burst stacking), so a starter build (fire
  // bolt + iron sword) can always win the mirror by a small margin (verified:
  // player wins at 5 HP in 7 rounds with both sides on the bot AI). Practice
  // is a sandbox — the NPC should teach, not stomp. Deliberately NO shield:
  // the bot AI shields whenever it drops below 40% HP, and two 45-absorb
  // shields stall the fight long enough for it to win a starter mirror.
  warlock: {
    id: 'warlock', name: 'Warlock', shape: 'square', color: '#8f6fd8',
    preset: {
      id: 'npc_warlock', name: 'Warlock', createdAt: 0,
      slots: { core: null, active1: 'fire_bolt', active2: null, passive1: null, passive2: null, weapon: null, armor: null, utility: null, ultimate: null },
    },
  },
  priest: {
    id: 'priest', name: 'Cult Priest', shape: 'circle', color: '#5dbf8f',
    preset: {
      id: 'npc_priest', name: 'Cult Priest', createdAt: 0,
      slots: { core: 'stone_core', active1: 'heal', active2: 'team_heal', passive1: 'regeneration', passive2: null, weapon: 'iron_sword', armor: 'light_armor', utility: 'life_amulet', ultimate: null },
    },
  },
  boss: {
    id: 'boss', name: 'WARDEN OF THE ARENA', shape: 'diamond', color: '#e0a33c',
    preset: {
      id: 'npc_boss', name: 'WARDEN OF THE ARENA', createdAt: 0,
      slots: { core: 'stone_core', active1: 'thunder_bolt', active2: 'fireball', passive1: 'counter', passive2: 'burning_soul', weapon: 'war_hammer', armor: 'heavy_armor', utility: 'reactive_shield', ultimate: 'inferno' },
    },
  },
};

// ------------------------------------------------------------
// PvP bot presets — used to fill teams in matchmaking.
// ------------------------------------------------------------
export const BOT_PRESETS: { name: string; preset: Preset }[] = [
  {
    name: 'Bot Brute', preset: {
      id: 'bot_brute', name: 'Bot Brute', createdAt: 0,
      slots: { core: 'stone_core', active1: 'fire_bolt', active2: 'shield', passive1: 'counter', passive2: 'vitality', weapon: 'war_hammer', armor: 'heavy_armor', utility: 'life_amulet', ultimate: 'iron_bulwark' },
    },
  },
  {
    // Glass-cannon caster. energy_core was removed: its +1 use on every
    // active turned poison 2->3 and fireball 1->2, which burst a 200 HP player
    // in a few turns under the new flat-attack damage formula. (Ultimates are
    // NOT affected by bonus uses — only actives.)
    name: 'Bot Warlock', preset: {
      id: 'bot_warlock', name: 'Bot Warlock', createdAt: 0,
      slots: { core: 'flame_core', active1: 'poison', active2: 'fireball', passive1: 'burning_soul', passive2: 'swift', weapon: 'iron_sword', armor: 'leather_armor', utility: null, ultimate: 'inferno' },
    },
  },
  {
    name: 'Bot Duelist', preset: {
      id: 'bot_duelist', name: 'Bot Duelist', createdAt: 0,
      slots: { core: 'gale_core', active1: 'vampiric_strike', active2: 'slow', passive1: 'swift', passive2: 'regeneration', weapon: 'light_blade', armor: 'light_armor', utility: 'speed_module', ultimate: 'overclock' },
    },
  },
  {
    name: 'Bot Cleric', preset: {
      id: 'bot_cleric', name: 'Bot Cleric', createdAt: 0,
      slots: { core: 'stone_core', active1: 'heal', active2: 'rally', passive1: 'regeneration', passive2: 'vitality', weapon: 'iron_sword', armor: 'light_armor', utility: 'life_amulet', ultimate: 'mass_renewal' },
    },
  },
];

export function getBotPreset(index: number): { name: string; preset: Preset } {
  return BOT_PRESETS[index % BOT_PRESETS.length];
}
