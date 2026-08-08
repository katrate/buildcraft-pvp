import { describe, expect, it } from 'vitest';
import { GEAR } from './gear';
import { POTIONS } from './potions';
import { POWERS } from './powers';
import { SLOTS } from '../constants';
import type { PowerKind } from '../types';

// Content budgets (V1): exactly 50 items in every sub-category, so the store
// has real depth but the data stays curated and reviewable.
const POWER_BUDGET: Record<PowerKind, number> = { core: 50, active: 50, passive: 50, ultimate: 50 };
const GEAR_BUDGET: Record<string, number> = { weapon: 50, armor: 50, utility: 50 };
const MIN_PURCHASE = 1000; // no purchase may be cheaper than this (economy rule)

describe('content budgets — 50 per sub-category', () => {
  it('has exactly 50 powers of every kind', () => {
    const byKind: Record<string, number> = {};
    for (const p of Object.values(POWERS)) {
      byKind[p.powerKind] = (byKind[p.powerKind] ?? 0) + 1;
    }
    for (const [kind, expected] of Object.entries(POWER_BUDGET)) {
      expect(byKind[kind], `powerKind ${kind}`).toBe(expected);
    }
  });

  it('has exactly 50 gear pieces in every slot', () => {
    const bySlot: Record<string, number> = {};
    for (const g of Object.values(GEAR)) {
      bySlot[g.slot] = (bySlot[g.slot] ?? 0) + 1;
    }
    for (const [slot, expected] of Object.entries(GEAR_BUDGET)) {
      expect(bySlot[slot], `gear slot ${slot}`).toBe(expected);
    }
  });

  it('has a non-trivial potion pool', () => {
    expect(Object.keys(POTIONS).length).toBeGreaterThanOrEqual(20);
  });
});

describe('content integrity', () => {
  it('every item id is unique across powers, gear and potions', () => {
    const seen = new Set<string>();
    for (const id of [...Object.keys(POWERS), ...Object.keys(GEAR), ...Object.keys(POTIONS)]) {
      expect(seen.has(id), `duplicate id ${id}`).toBe(false);
      seen.add(id);
    }
  });

  it('every item costs at least MIN_PURCHASE (no cheap power spikes)', () => {
    for (const p of Object.values(POWERS)) expect(p.price, p.id).toBeGreaterThanOrEqual(MIN_PURCHASE);
    for (const g of Object.values(GEAR)) expect(g.price, g.id).toBeGreaterThanOrEqual(MIN_PURCHASE);
    for (const pot of Object.values(POTIONS)) expect(pot.price, pot.id).toBeGreaterThanOrEqual(MIN_PURCHASE);
  });

  it('gear and powers reference a real slot that matches their group', () => {
    const slotIds = new Set(SLOTS.map((s) => s.id));
    const slotFor = new Map(SLOTS.map((s) => [s.id, s]));
    for (const g of Object.values(GEAR)) {
      expect(slotIds.has(g.slot), `${g.id} slot`).toBe(true);
      expect(slotFor.get(g.slot)?.accepts, `${g.id} slot accepts`).toBe('gear');
    }
    for (const p of Object.values(POWERS)) {
      expect(slotIds.has(p.slot), `${p.id} slot`).toBe(true);
      expect(slotFor.get(p.slot)?.accepts, `${p.id} slot accepts`).toBe('power');
    }
    // Potions have no fixed slot — they fit any potion slot (potion1-3).
  });

  it('every potion has at least one effect, heal or ultimate charge', () => {
    for (const pot of Object.values(POTIONS)) {
      const hasEffect = pot.healAmount !== undefined || pot.ultimateCharge !== undefined || (pot.effects?.length ?? 0) > 0;
      expect(hasEffect, pot.id).toBe(true);
      expect(pot.uses).toBeGreaterThan(0);
    }
  });
});
