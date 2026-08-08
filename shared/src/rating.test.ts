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
  it('maps ratings to tiers', () => {
    expect(tierForRating(1000)).toBe(0); // bronze
    expect(tierForRating(1100)).toBe(1); // silver
    expect(tierForRating(1299)).toBe(1);
    expect(tierForRating(1300)).toBe(2); // gold
    expect(tierForRating(1500)).toBe(3); // platinum
    expect(tierForRating(1700)).toBe(4); // diamond
  });

  it('bandForRating returns the right band with upgrade ceiling', () => {
    expect(bandForRating(1200).name).toBe('Silver');
    expect(bandForRating(1200).maxUpgradeLevel).toBe(8);
    expect(bandForRating(1800).maxUpgradeLevel).toBe(20);
  });

  it('ratingToNextBand is null at the top and positive otherwise', () => {
    expect(ratingToNextBand(1000)).toBe(1100);
    expect(ratingToNextBand(1699)).toBe(1700);
    expect(ratingToNextBand(2000)).toBeNull();
  });

  it('progressInBand is bounded 0..1', () => {
    expect(progressInBand(0)).toBe(0);
    // bronze spans 0-1100, so 1000 is ~91% of the way through it
    expect(progressInBand(1000)).toBeCloseTo(1000 / 1100, 3);
    expect(progressInBand(1099)).toBeCloseTo(1099 / 1100, 3);
    expect(progressInBand(1800)).toBe(1); // diamond has no next band
  });

  it('start rating is bronze with a sane initial delta path', () => {
    expect(START_RATING).toBe(1000);
  });
});
