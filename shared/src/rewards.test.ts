import { describe, expect, it } from 'vitest';
import { computeRewards, validatePurchase, PERFORMANCE_BONUS } from './rewards';

function r(result: 'victory' | 'defeat' | 'draw', mode: 'practice' | 'unranked' | 'ranked' | 'custom', roundsSurvived: number, kills = 0) {
  return computeRewards(result, mode, { roundsSurvived, kills });
}

describe('rewards: result base', () => {
  it('victory pays more than defeat in every progression mode', () => {
    for (const mode of ['unranked', 'ranked'] as const) {
      const win = r('victory', mode, 3, 0);
      const lose = r('defeat', mode, 3, 0);
      expect(win.xp).toBeGreaterThan(lose.xp);
      expect(win.coins).toBeGreaterThan(lose.coins);
    }
  });

  it('ranked pays more than unranked at the same result', () => {
    expect(r('victory', 'ranked', 3, 0).coins).toBeGreaterThan(r('victory', 'unranked', 3, 0).coins);
    expect(r('victory', 'ranked', 3, 0).xp).toBeGreaterThan(r('victory', 'unranked', 3, 0).xp);
  });

  it('losses still pay so they never feel wasted', () => {
    const lose = r('defeat', 'unranked', 3, 0);
    expect(lose.coins).toBeGreaterThan(0);
    expect(lose.xp).toBeGreaterThan(0);
  });

  it('practice pays NO coins or XP — a training sandbox cannot farm progress', () => {
    // Even a long, multi-kill stomp pays nothing: no economy hole via NPCs.
    expect(r('victory', 'practice', 0, 0).coins).toBe(0);
    expect(r('victory', 'practice', 0, 0).xp).toBe(0);
    expect(r('defeat', 'practice', 0, 0).coins).toBe(0);
    expect(r('draw', 'practice', 60, 99).coins).toBe(0);
    expect(r('draw', 'practice', 60, 99).xp).toBe(0);
  });

  it('custom awards NO coins or XP — friend lobbies cannot be farmed', () => {
    // A 2v5 stomp, even a long one with kills, pays nothing: no economy hole.
    expect(r('victory', 'custom', 0, 0).coins).toBe(0);
    expect(r('victory', 'custom', 0, 0).xp).toBe(0);
    expect(r('defeat', 'custom', 0, 0).coins).toBe(0);
    expect(r('draw', 'custom', 60, 99).coins).toBe(0);
    expect(r('draw', 'custom', 60, 99).xp).toBe(0);
    // MatchRewards has no token field anymore — nothing to farm.
    expect('tokens' in r('victory', 'practice', 0, 0)).toBe(false);
  });
});

describe('rewards: performance bonuses', () => {
  it('adds kill bonuses up to the cap', () => {
    const one = r('victory', 'unranked', 3, 1);
    const five = r('victory', 'unranked', 3, 5);
    const cap = r('victory', 'unranked', 3, PERFORMANCE_BONUS.maxKillBonuses);
    expect(one.breakdown?.killCoins).toBe(PERFORMANCE_BONUS.killCoins);
    expect(five.breakdown?.kills).toBe(PERFORMANCE_BONUS.maxKillBonuses); // capped at 3
    expect(five.coins).toBe(cap.coins); // 5 kills and 3 kills pay the same
  });

  it('adds round bonuses every N rounds', () => {
    const short = r('victory', 'unranked', 2, 0);
    const long = r('victory', 'unranked', 7, 0);
    expect(short.breakdown?.roundCoins).toBe(0);
    expect(long.breakdown?.roundCoins).toBe(
      Math.floor(7 / PERFORMANCE_BONUS.roundsPerTick) * PERFORMANCE_BONUS.roundCoins,
    );
    expect(long.coins).toBeGreaterThan(short.coins);
  });

  it('breakdown sums match the totals exactly', () => {
    const rewards = r('victory', 'ranked', 8, 2);
    const b = rewards.breakdown!;
    expect(rewards.coins).toBe(b.baseCoins + b.killCoins + b.roundCoins);
    expect(rewards.xp).toBe(b.baseXp + b.killXp + b.roundXp);
  });

  it('longer fights and kills cannot out-earn winning', () => {
    // A 60-round defeat with max kills still pays less than a short victory.
    const farmed = r('defeat', 'unranked', 60, 99);
    const won = r('victory', 'unranked', 3, 0);
    expect(farmed.coins).toBeLessThan(won.coins);
  });
});

describe('rewards: purchase validation', () => {
  it('validates purchases', () => {
    expect(validatePurchase(100, 100)).toBe(true);
    expect(validatePurchase(99, 100)).toBe(false);
  });
});
