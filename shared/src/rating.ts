import type { PlayerResult } from './types';

// ------------------------------------------------------------
// Ranked rating (ELO-style).
//
// Every player has a hidden rating (starts at START_RATING).
// Rank tiers are bands of rating (8 tiers, 150 rating wide):
//   Iron < 1000, Bronze 1000-1149, Silver 1150-1299, Gold 1300-1449,
//   Platinum 1450-1599, Diamond 1600-1749, Divine 1750-1899,
//   Supreme 1900+.
//
// RP gain/loss depends on the OPPONENT's strength:
//   expected = 1 / (1 + 10^((opp - mine) / 400))
//   delta    = round(K * (score - expected))
//   score = 1 win / 0.5 draw / 0 loss
//
// So beating a much stronger player gains a lot, losing to a much
// weaker player loses a lot, and equal matches swing by K/2.
// ------------------------------------------------------------

// New players start inside the bottom band (Iron). Every ladder begins at the
// same floor and climbs from there.
export const START_RATING = 850;
export const K_FACTOR = 32;

export interface RatingBand {
  id: string;
  name: string;
  color: string;
  minRating: number; // inclusive floor of the band
  maxUpgradeLevel: number; // ranked stat upgrade ceiling for this band
}

export const RATING_BANDS: RatingBand[] = [
  // Iron is the wide floor (0–999): every new account lands here at
  // START_RATING 850, and a few losses cannot drop anyone out of it.
  // Every band above is a fixed 150-rating-wide step to the next.
  { id: 'iron', name: 'Iron', color: '#9aa0a6', minRating: 0, maxUpgradeLevel: 3 },
  { id: 'bronze', name: 'Bronze', color: '#cd7f32', minRating: 1000, maxUpgradeLevel: 6 },
  { id: 'silver', name: 'Silver', color: '#c0c0c0', minRating: 1150, maxUpgradeLevel: 9 },
  { id: 'gold', name: 'Gold', color: '#ffd700', minRating: 1300, maxUpgradeLevel: 12 },
  { id: 'platinum', name: 'Platinum', color: '#7fd4e0', minRating: 1450, maxUpgradeLevel: 15 },
  { id: 'diamond', name: 'Diamond', color: '#b9f2ff', minRating: 1600, maxUpgradeLevel: 18 },
  { id: 'divine', name: 'Divine', color: '#c084fc', minRating: 1750, maxUpgradeLevel: 21 },
  { id: 'supreme', name: 'Supreme', color: '#ff4655', minRating: 1900, maxUpgradeLevel: 24 },
];

// Probability that `a` beats `b` (0..1). Symmetric: E(a,b) + E(b,a) = 1.
export function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

// The rating change for a player of `myRating` playing someone of
// `oppRating` and getting `result`. Positive = gain, negative = loss.
export function ratingDelta(
  myRating: number,
  oppRating: number,
  result: PlayerResult,
  k = K_FACTOR,
): number {
  const score = result === 'victory' ? 1 : result === 'draw' ? 0.5 : 0;
  let delta = Math.round(k * (score - expectedScore(myRating, oppRating)));
  // A win always gains at least 1 and a loss always costs at least 1 — a
  // "win +0 RP" reads like a bug even though it is standard ELO behavior.
  if (score === 1) delta = Math.max(1, delta);
  else if (score === 0) delta = Math.min(-1, delta);
  return delta;
}

// Which band a rating belongs to (index into RATING_BANDS).
export function tierForRating(rating: number): number {
  let tier = 0;
  for (let i = 0; i < RATING_BANDS.length; i += 1) {
    if (rating >= RATING_BANDS[i].minRating) tier = i;
  }
  return tier;
}

export function bandForRating(rating: number): RatingBand {
  return RATING_BANDS[tierForRating(rating)];
}

// Rating needed to reach the next band (null at the top).
export function ratingToNextBand(rating: number): number | null {
  const tier = tierForRating(rating);
  const next = RATING_BANDS[tier + 1];
  return next ? next.minRating : null;
}

// Progress (0..1) within the current band toward the next one.
export function progressInBand(rating: number): number {
  const tier = tierForRating(rating);
  const band = RATING_BANDS[tier];
  const next = RATING_BANDS[tier + 1];
  if (!next) return 1;
  return Math.min(1, Math.max(0, (rating - band.minRating) / (next.minRating - band.minRating)));
}

export function clampRating(r: number): number {
  return Math.max(0, Math.round(r));
}
