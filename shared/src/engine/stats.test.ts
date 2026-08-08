import { describe, expect, it } from 'vitest';
import type { Preset } from '../types';
import { computeStats } from './stats';

function preset(slots: Record<string, string | null>): Preset {
  return { id: 'p', name: 'p', createdAt: 0, slots };
}

describe('computeStats', () => {
  it('applies base stats with no items', () => {
    const s = computeStats(preset({}));
    expect(s.stats).toEqual({ maxHp: 100, attack: 10, defense: 5, initiative: 10 });
  });

  it('sums gear and power stat bonuses', () => {
    const s = computeStats(preset({
      core: 'flame_core', // +3 atk
      weapon: 'war_hammer', // +5 atk, -2 ini
      armor: 'heavy_armor', // +4 def, +20 hp, -2 ini
      passive1: 'swift', // +2 ini
    }));
    expect(s.stats.maxHp).toBe(120);
    expect(s.stats.attack).toBe(18);
    expect(s.stats.defense).toBe(9);
    expect(s.stats.initiative).toBe(8);
  });

  it('energy core grants bonus ability uses instead of energy', () => {
    const s = computeStats(preset({ active1: 'fire_bolt', active2: 'poison', utility: 'energy_core' }));
    expect(s.bonusAbilityUses).toBe(1);
  });

  it('collects actives, passives, core, ultimate', () => {
    const s = computeStats(preset({
      core: 'stone_core',
      active1: 'fire_bolt',
      active2: 'heal',
      passive1: 'counter',
      ultimate: 'inferno',
    }));
    expect(s.actives.map((p) => p.id)).toEqual(['fire_bolt', 'heal']);
    expect(s.core?.id).toBe('stone_core');
    expect(s.passives.map((p) => p.id)).toEqual(['counter']);
    expect(s.ultimate?.id).toBe('inferno');
  });

  it('applies gear start-of-match effects (reactive shield)', () => {
    const s = computeStats(preset({ utility: 'reactive_shield' }));
    expect(s.startingEffects.some((e) => e.kind === 'shield')).toBe(true);
  });

  it('ignores unknown item ids', () => {
    const s = computeStats(preset({ weapon: 'does_not_exist' }));
    expect(s.stats.attack).toBe(10);
  });
});
