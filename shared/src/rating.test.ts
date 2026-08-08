import { describe, expect, it } from 'vitest';
import {
  START_RATING,
  bandForRating,
  expectedScore,
  progressInBand,
  ratingDelta,
  ratingToNextBand,
  tierForRating,
} from './rating';

describe('expectedScore', () => {
  it('is 0.5 for equal ratings', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 5);
  });

  it('favors the higher rating and is symmetric', () => {
    const ea = expectedScore(1000, 1200);
    const eb = expectedScore(1200, 1000);
    expect(ea).toBeLessThan(0.5);
    expect(eb).toBeGreaterThan(0.5);
    expect(ea + eb).toBeCloseTo(1, 5);
  });

  it('a 400-point gap is a ~10:1 expectation', () => {
    expect(expectedScore(1400, 1000)).toBeCloseTo(1 / (1 + Math.pow(10, -400 / 400)), 5);
    expect(expectedScore(1000, 1400)).toBeCloseTo(1 / (1 + Math.pow(10, 400 / 400)), 5);
  });
});

describe('ratingDelta', () => {
  it('equal ratings: win +K/2, loss -K/2, draw 0', () => {
    expect(ratingDelta(1000, 1000, 'victory')).toBe(16);
    expect(ratingDelta(1000, 1000, 'defeat')).toBe(-16);
    expect(ratingDelta(1000, 1000, 'draw')).toBe(0);
  });

  it('beating a much stronger player gains a lot', () => {
    // 1000 beats 1400: expected ~0.031 -> +31
    const d = ratingDelta(1000, 1400, 'victory');
    expect(d).toBeGreaterThan(25);
  });

  it('losing to a much weaker player loses a lot', () => {
    // 1400 loses to 1000: expected ~0.969 -> -31
    const d = ratingDelta(1400, 1000, 'defeat');
    expect(d).toBeLessThan(-25);
  });

  it('a favorite barely gains for beating a weak player and barely loses for an upset', () => {
    // 400-point gap: expected 0.909 -> delta rounds to ±3, not ±16
    expect(ratingDelta(1400, 1000, 'victory')).toBeLessThanOrEqual(3);
    expect(ratingDelta(1400, 1000, 'victory')).toBeGreaterThan(0);
    expect(ratingDelta(1000, 1400, 'defeat')).toBeGreaterThanOrEqual(-3);
    expect(ratingDelta(1000, 1400, 'defeat')).toBeLessThan(0);
  });

  it('never rewards a loss (win delta always positive, loss delta always negative)', () => {
    for (const [a, b] of [[900, 1000], [1000, 900], [1500, 900], [900, 1500]] as const) {
      expect(ratingDelta(a, b, 'victory')).toBeGreaterThan(0);
      expect(ratingDelta(a, b, 'defeat')).toBeLessThan(0);
    }
  });

  it('a lopsided win still pays at least +1 (no confusing +0 wins)', () => {
    expect(ratingDelta(2000, 1000, 'victory')).toBeGreaterThanOrEqual(1);
    expect(ratingDelta(1000, 2000, 'defeat')).toBeLessThanOrEqual(-1);
  });
});

describe('rating bands', () => {
  it('maps ratings to tiers across all 8 bands', () => {
    expect(tierForRating(500)).toBe(0); // iron
    expect(tierForRating(1000)).toBe(1); // bronze
    expect(tierForRating(1100)).toBe(1);
    expect(tierForRating(1150)).toBe(2); // silver
    expect(tierForRating(1299)).toBe(2);
    expect(tierForRating(1300)).toBe(3); // gold
    expect(tierForRating(1450)).toBe(4); // platinum
    expect(tierForRating(1600)).toBe(5); // diamond
    expect(tierForRating(1750)).toBe(6); // divine
    expect(tierForRating(1900)).toBe(7); // supreme
  });

  it('bandForRating returns the right band with upgrade ceiling', () => {
    expect(bandForRating(1200).name).toBe('Silver');
    expect(bandForRating(1200).maxUpgradeLevel).toBe(9);
    expect(bandForRating(1800).maxUpgradeLevel).toBe(21); // divine
    expect(bandForRating(2000).maxUpgradeLevel).toBe(24); // supreme
  });

  it('ratingToNextBand is null at the top and positive otherwise', () => {
    expect(ratingToNextBand(1000)).toBe(1150);
    expect(ratingToNextBand(1699)).toBe(1750);
    expect(ratingToNextBand(2000)).toBeNull();
  });

  it('progressInBand is bounded 0..1', () => {
    expect(progressInBand(0)).toBe(0);
    // iron spans 0-999, so 500 is halfway through it
    expect(progressInBand(500)).toBeCloseTo(0.5, 3);
    expect(progressInBand(1125)).toBeCloseTo(125 / 150, 3); // bronze toward silver
    expect(progressInBand(2000)).toBe(1); // supreme has no next band
  });

  it('start rating is iron with a sane initial delta path', () => {
    expect(START_RATING).toBe(850);
    expect(tierForRating(START_RATING)).toBe(0);
  });
});
