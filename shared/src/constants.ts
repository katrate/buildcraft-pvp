import type { SlotDef, StatId } from './types';

// ------------------------------------------------------------
// Build slots — configurable so the system can expand later
// ------------------------------------------------------------
export const SLOTS: SlotDef[] = [
  { id: 'core', label: 'Core Power', accepts: 'power', description: 'Defines the identity of the build' },
  { id: 'active1', label: 'Active 1', accepts: 'power', description: 'Main ability' },
  { id: 'active2', label: 'Active 2', accepts: 'power', description: 'Secondary ability' },
  { id: 'passive1', label: 'Passive 1', accepts: 'power', description: 'Passive effect' },
  { id: 'passive2', label: 'Passive 2', accepts: 'power', description: 'Passive effect' },
  { id: 'weapon', label: 'Weapon', accepts: 'gear', description: 'Primary gear stat stick' },
  { id: 'armor', label: 'Armor', accepts: 'gear', description: 'Defensive gear' },
  { id: 'utility', label: 'Utility', accepts: 'gear', description: 'Utility gear' },
  { id: 'ultimate', label: 'Ultimate', accepts: 'power', description: 'Charges up, then unleashes' },
];

export const STAT_IDS: StatId[] = ['maxHp', 'attack', 'defense', 'initiative'];

export const STAT_LABELS: Record<StatId, string> = {
  maxHp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  initiative: 'Initiative',
};

// ------------------------------------------------------------
// Base combat stats (before gear/powers)
// HP has NO ranked modifier: 200 by default, raised only by build
// elements (armor/passives/cores that grant HP).
// Attack is the base every damaging power builds on:
//   damage = power.attack + attacker.Attack - defender.Defense
// ------------------------------------------------------------
export const BASE_STATS = {
  maxHp: 200,
  attack: 20,
  defense: 5,
  initiative: 10,
};

// ------------------------------------------------------------
// Combat rules
// ------------------------------------------------------------
// Safety valve: no match may exceed this many rounds. Guarantees termination
// even when sustained healing creates stalemates (time limit -> HP victory).
export const MAX_ROUNDS = 100;
// Ultimate charge: a whole-number counter. +1 at the start of every round,
// +1 per kill. Reaching ULTIMATE_CHARGE_MAX lets you fire the ultimate.
export const ULTIMATE_CHARGE_MAX = 5;
export const ULTIMATE_CHARGE_PER_ROUND = 1;
export const ULTIMATE_CHARGE_PER_KILL = 1;
export const TURN_TIMEOUT_MS = 45_000; // server auto-ends turns
export const DISCONNECT_GRACE_MS = 60_000;
export const BOT_THINK_MS = 1100; // bot action delay (server + practice)

// Matchmaking: how long the queue keeps looking for REAL players after the
// last join. Every new player that joins resets this clock; if it expires,
// the match starts and the remaining slots are filled with bots.
export const MATCHMAKING_BOT_FILL_WAIT_MS = 15_000;

// Match countdown: when a match is formed, players see a short "match found"
// loading screen before the arena starts (server-authoritative start).
export const MATCH_COUNTDOWN_MS = 5_000;

// Ranked rank-window widening: normally a ranked player only faces players of
// the same rank band or one band ± (spread <= 1). If the longest-waiting
// player in the queue has waited this long, the window widens to ±2 bands
// (spread <= 2) so sparse ranks don't wait forever.
export const RANKED_WINDOW_WIDEN_AFTER_MS = 60_000;

// ------------------------------------------------------------
// Player level — endless. There is NO cap: levels keep climbing forever and
// the XP requirement grows every level (see progression.ts xpToNextLevel).
// Level 20 is only the ranked-unlock threshold, not a ceiling.
// ------------------------------------------------------------
export const RANKED_UNLOCK_LEVEL = 20;

export const RANK_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#7fd4e0',
  diamond: '#b9f2ff',
};

// ------------------------------------------------------------
// Unranked normalization
// ------------------------------------------------------------
// Everything is re-based toward UNRANKED_REFERENCE_LEVEL so a fresh
// account and a veteran have comparable stat budgets in unranked.
export const UNRANKED_REFERENCE_LEVEL = 10;
export const NORMALIZATION_BRACKETS: Record<StatId, { floor: number; ceiling: number }> = {
  maxHp: { floor: 160, ceiling: 260 },
  attack: { floor: 12, ceiling: 26 },
  defense: { floor: 3, ceiling: 16 },
  initiative: { floor: 6, ceiling: 22 },
};

// ------------------------------------------------------------
// Coin-based initiative upgrade (Build section)
// Determines who acts first. Applies in EVERY mode and is deliberately
// NOT normalized in unranked — a real competitive spend.
// cost = baseCost + level * costStep
// ------------------------------------------------------------
export const INITIATIVE_UPGRADE = {
  baseCost: 1000,
  costStep: 250,
  gainPerLevel: 1, // +1 initiative per level
  maxLevel: 100, // effectively endless; cost keeps climbing
};

// ------------------------------------------------------------
// Ranked stat upgrades (Build section) — apply ONLY in ranked matches.
// Rank determines the ceiling (see progression.ts RANKS).
// cost = baseCost + level * costStep
// ------------------------------------------------------------
export const RANKED_UPGRADE = {
  baseCost: 1000,
  costStep: 250,
  maxLevel: 20, // absolute per-stat cap (rank may cap lower)
  // Only Attack and Defense get ranked modifiers — HP has none (200 base,
  // build elements only). Attack is added to every hit you land.
  gains: { attack: 1.5, defense: 1 } as Partial<Record<StatId, number>>,
  labels: { attack: 'Combat Power', defense: 'Combat Armor' } as Record<string, string>,
};

// ------------------------------------------------------------
// Starter kit. New players start with one affordable purchase so the
// store is immediately useful, but every purchase costs >= MIN_PURCHASE
// so power cannot be stacked after one or two matches.
// ------------------------------------------------------------
export const STARTER = {
  coins: 1000,
  ownedPowers: ['fire_bolt'],
  ownedGear: ['iron_sword'],
  presetName: 'Starter',
  presetSlots: { core: null, active1: 'fire_bolt', active2: null, passive1: null, passive2: null, weapon: 'iron_sword', armor: null, utility: null, ultimate: null },
};
