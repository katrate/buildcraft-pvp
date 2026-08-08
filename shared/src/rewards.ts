import type { MatchMode, MatchRewards, PlayerResult, RewardBreakdown } from './types';

// ------------------------------------------------------------
// Reward calculation.
//
// totals = base[result][mode] + capped kill/round performance bonus
//
//   kill bonus : +killCoins/killXp per kill, at most maxKillBonuses kills
//   round bonus: +roundCoins/roundXp every roundsPerTick rounds fought
//   hard caps  : the total bonus (kills + rounds) can never exceed
//                maxBonusCoins / maxBonusXp — and those caps are chosen
//                below the victory-vs-defeat base gap, so a farmed loss
//                (drag rounds, chase kills) can NEVER out-earn a win.
// ------------------------------------------------------------

export const REWARD_TABLE: Record<MatchMode, Record<PlayerResult, { xp: number; coins: number }>> = {
  // Practice = the solo sandbox — pays exactly like unranked so solo players
  // can still progress without queueing.
  practice: {
    victory: { xp: 100, coins: 50 },
    defeat: { xp: 30, coins: 20 },
    draw: { xp: 50, coins: 30 },
  },
  unranked: {
    victory: { xp: 100, coins: 50 },
    defeat: { xp: 30, coins: 20 },
    draw: { xp: 50, coins: 30 },
  },
  ranked: {
    victory: { xp: 150, coins: 90 },
    defeat: { xp: 50, coins: 40 },
    draw: { xp: 75, coins: 60 },
  },
  // Custom friend lobbies award NO coins/XP. They are fun-only (any team
  // split, leader-chosen normalization) — if they paid, friends could farm
  // 2v5 stomps for currency, which is exactly the economy inflation we
  // want to avoid. Practice is the mode that pays for solo play.
  custom: {
    victory: { xp: 0, coins: 0 },
    defeat: { xp: 0, coins: 0 },
    draw: { xp: 0, coins: 0 },
  },
};

export const PERFORMANCE_BONUS = {
  killXp: 8,
  killCoins: 8,
  maxKillBonuses: 3, // at most 3 kills count toward the bonus
  roundXp: 5,
  roundCoins: 5,
  roundsPerTick: 3,
  // Hard caps keep farmed losses below the victory base:
  //   unranked coin gap = 30 -> cap 20   (ranked gap = 50 -> cap 20 still safe)
  //   unranked XP gap   = 70 -> cap 60
  maxBonusCoins: 20,
  maxBonusXp: 60,
};

export interface RewardPerformance {
  roundsSurvived: number;
  kills: number;
}

export function computeRewards(result: PlayerResult, mode: MatchMode, perf: RewardPerformance): MatchRewards {
  const base = REWARD_TABLE[mode][result];
  // Custom friend lobbies pay nothing at all — not even performance bonuses,
  // or a 2v5 stomp with many kills would still mint currency.
  const earning = mode !== 'custom';
  const killBonuses = earning ? Math.min(perf.kills, PERFORMANCE_BONUS.maxKillBonuses) : 0;
  const roundTicks = earning ? Math.floor(perf.roundsSurvived / PERFORMANCE_BONUS.roundsPerTick) : 0;

  // Raw bonuses, then scale the total down if it exceeds the hard cap.
  const rawKillCoins = killBonuses * PERFORMANCE_BONUS.killCoins;
  const rawRoundCoins = roundTicks * PERFORMANCE_BONUS.roundCoins;
  const rawKillXp = killBonuses * PERFORMANCE_BONUS.killXp;
  const rawRoundXp = roundTicks * PERFORMANCE_BONUS.roundXp;

  const coinsScale = rawKillCoins + rawRoundCoins > 0
    ? Math.min(1, PERFORMANCE_BONUS.maxBonusCoins / (rawKillCoins + rawRoundCoins))
    : 0;
  const xpScale = rawKillXp + rawRoundXp > 0
    ? Math.min(1, PERFORMANCE_BONUS.maxBonusXp / (rawKillXp + rawRoundXp))
    : 0;

  let killCoins = Math.round(rawKillCoins * coinsScale);
  let roundCoins = Math.round(rawRoundCoins * coinsScale);
  let killXp = Math.round(rawKillXp * xpScale);
  let roundXp = Math.round(rawRoundXp * xpScale);
  // Guard against independent rounding pushing the sum one over the hard cap.
  if (killCoins + roundCoins > PERFORMANCE_BONUS.maxBonusCoins) {
    roundCoins = PERFORMANCE_BONUS.maxBonusCoins - killCoins;
  }
  if (killXp + roundXp > PERFORMANCE_BONUS.maxBonusXp) {
    roundXp = PERFORMANCE_BONUS.maxBonusXp - killXp;
  }

  const breakdown: RewardBreakdown = {
    baseXp: base.xp,
    baseCoins: base.coins,
    killXp,
    killCoins,
    roundXp,
    roundCoins,
    kills: killBonuses,
  };

  return {
    result,
    xp: base.xp + killXp + roundXp,
    coins: base.coins + killCoins + roundCoins,
    roundsSurvived: perf.roundsSurvived,
    breakdown,
  };
}

// Store pricing sanity check used server-side and in purchase logic.
export function validatePurchase(coins: number, price: number): boolean {
  return coins >= price;
}
