import { RANKED_UNLOCK_LEVEL } from './constants';
import {
  RATING_BANDS,
  bandForRating,
  clampRating,
  ratingToNextBand,
} from './rating';
import type { PlayerRank } from './types';

// XP needed to go from `level` to `level + 1`.
// Configurable curve — easy to re-tune later.
export function xpToNextLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.6));
}

export function addXp(level: number, xp: number, amount: number): { level: number; xp: number; leveledUp: boolean } {
  let lvl = level;
  let cur = xp + amount;
  let leveledUp = false;
  // No cap — levels rise endlessly. The loop always terminates because
  // xpToNextLevel grows with level, so eventually cur < the next threshold.
  while (cur >= xpToNextLevel(lvl)) {
    cur -= xpToNextLevel(lvl);
    lvl += 1;
    leveledUp = true;
  }
  return { level: lvl, xp: cur, leveledUp };
}

export function isRankedUnlocked(level: number): boolean {
  return level >= RANKED_UNLOCK_LEVEL;
}

export function progressToNextLevel(level: number, xp: number): number {
  const need = xpToNextLevel(level);
  return Math.min(1, xp / need);
}

// ------------------------------------------------------------
// Ranked ladder = ELO rating bands (see rating.ts for the math).
// Rank determines how far the player's ranked stat upgrades can go
// (maxUpgradeLevel applies per stat). Ranked rewards skill, not
// grinding time — the band bounds raw stat scaling.
// ------------------------------------------------------------
export type RankDef = (typeof RATING_BANDS)[number];
export const RANKS: RankDef[] = RATING_BANDS;

export function getRank(tier: number): RankDef {
  return RANKS[Math.max(0, Math.min(RANKS.length - 1, Math.floor(tier)))];
}

export function rankForRating(rating: number): RankDef {
  return bandForRating(rating);
}

export function maxRankedUpgradeFor(tier: number): number {
  return getRank(tier).maxUpgradeLevel;
}

// Apply a ranked match's rating delta (server-computed).
export function applyRankDelta(rank: PlayerRank, delta: number): PlayerRank {
  return { rating: clampRating(rank.rating + delta), games: rank.games + 1 };
}

export function rankStatusText(rank: PlayerRank): string {
  const band = bandForRating(rank.rating);
  const next = ratingToNextBand(rank.rating);
  const head = `${band.name} · ${rank.rating} RP`;
  if (next === null) return `${head} — MAX`;
  return `${head} · ${next - rank.rating} to next`;
}
