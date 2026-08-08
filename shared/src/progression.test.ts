import { describe, expect, it } from 'vitest';
import { addXp, isRankedUnlocked, progressToNextLevel, xpToNextLevel } from './progression';

describe('progression', () => {
  it('xp curve increases with level — forever', () => {
    expect(xpToNextLevel(2)).toBeGreaterThan(xpToNextLevel(1));
    expect(xpToNextLevel(21)).toBeGreaterThan(xpToNextLevel(20));
    expect(xpToNextLevel(100)).toBeGreaterThan(xpToNextLevel(50));
  });

  it('levels up and carries over remaining xp', () => {
    const need = xpToNextLevel(1);
    const res = addXp(1, 0, need + 25);
    expect(res.level).toBe(2);
    expect(res.xp).toBe(25);
    expect(res.leveledUp).toBe(true);
  });

  it('has no level cap — levels keep rising past 20 endlessly', () => {
    // A big burst of XP climbs straight through level 20 and far beyond.
    const res = addXp(20, 0, xpToNextLevel(20) + xpToNextLevel(21) + 7);
    expect(res.level).toBe(22);
    expect(res.xp).toBe(7);
    expect(res.leveledUp).toBe(true);
    // Massive amounts of XP still level up rather than being wasted at a cap.
    const big = addXp(50, 0, 10_000_000);
    expect(big.level).toBeGreaterThan(50);
    expect(big.xp).toBeGreaterThanOrEqual(0);
  });

  it('unlocks ranked at level 20', () => {
    expect(isRankedUnlocked(19)).toBe(false);
    expect(isRankedUnlocked(20)).toBe(true);
  });

  it('progress bar is bounded', () => {
    expect(progressToNextLevel(1, 0)).toBe(0);
    expect(progressToNextLevel(50, 0)).toBe(0);
    expect(progressToNextLevel(1, 100000)).toBeLessThanOrEqual(1);
  });
});
