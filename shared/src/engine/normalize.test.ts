import { describe, expect, it } from 'vitest';
import { normalizeUnranked } from './normalize';

describe('normalizeUnranked', () => {
  it('scales an overleveled build back toward the reference level', () => {
    const raw = { maxHp: 220, attack: 22, defense: 14, initiative: 20 };
    const out = normalizeUnranked(raw);
    expect(out.attack).toBeLessThan(22);
    expect(out.maxHp).toBeLessThan(220);
  });

  it('keeps the relative shape of the build (glass cannon stays glassy)', () => {
    const cannon = normalizeUnranked({ maxHp: 90, attack: 22, defense: 4, initiative: 18 });
    const tank = normalizeUnranked({ maxHp: 220, attack: 10, defense: 14, initiative: 7 });
    expect(cannon.attack).toBeGreaterThan(tank.attack);
    expect(tank.maxHp).toBeGreaterThan(cannon.maxHp);
    expect(tank.defense).toBeGreaterThan(cannon.defense);
  });

  it('clamps within the defined brackets', () => {
    const out = normalizeUnranked({ maxHp: 10, attack: 1, defense: 1, initiative: 1 });
    expect(out.maxHp).toBeGreaterThanOrEqual(80);
    expect(out.attack).toBeGreaterThanOrEqual(8);
  });
});
