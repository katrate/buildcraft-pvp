import { beforeEach, describe, expect, it, vi } from 'vitest';

// The store reads localStorage at module load, so each scenario stubs storage
// and re-imports the module fresh.
const KEY = 'buildcraft_pvp_state_v1';

function stubStorage(init: Record<string, string>): void {
  const m = new Map(Object.entries(init));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => void m.clear(),
  });
}

function legacySave(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    playerId: 'p1',
    name: 'OldPilot',
    level: 3,
    xp: 5,
    coins: 500,
    inventory: { powers: ['fire_bolt'], gear: ['iron_sword'] },
    presets: [{ id: 'x', name: 'x', createdAt: 0, slots: { active1: 'fire_bolt' } }],
    activePresetId: 'x',
    record: { wins: 2, losses: 1, matches: 3 },
    initiativeUpgrade: 4,
    rankedUpgrades: { attack: 7, defense: 3 },
    rank: { rating: 1350, games: 12 },
    friends: [],
    ...overrides,
  });
}

describe('store migration → per-format ranked ladders', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('migrates a legacy single-ladder save into the 5v5 pool; 1v1 starts fresh', async () => {
    stubStorage({ [KEY]: legacySave() });
    const store = await import('./store');
    const s = store.getState();
    // Legacy rank (1350) carries to the 5v5 ladder; 1v1 is untouched and fresh.
    expect(s.ranks['1v1']).toEqual({ rating: 1000, games: 0 });
    expect(s.ranks['5v5']).toEqual({ rating: 1350, games: 12 });
    // Legacy upgrade pool carries to 5v5; 1v1 pool is fresh zeros.
    expect(s.rankedUpgrades['1v1']).toEqual({ attack: 0, defense: 0 });
    expect(s.rankedUpgrades['5v5']).toEqual({ attack: 7, defense: 3 });
    // No undefined ladders anywhere — every format is addressable.
    expect(typeof s.ranks['1v1'].rating).toBe('number');
    expect(typeof s.ranks['5v5'].rating).toBe('number');
  });

  it('migrates the old tier/points ladder (pre-ELO) into the 5v5 rating', async () => {
    stubStorage({
      [KEY]: legacySave({ rank: { tier: 2, points: 40 } }),
    });
    const store = await import('./store');
    const s = store.getState();
    expect(s.ranks['5v5'].rating).toBe(1000 + 2 * 200); // tier 2 -> Gold-ish
    expect(s.ranks['1v1'].rating).toBe(1000);
  });

  it('never wipes an already-migrated save on reload', async () => {
    // A save that already uses the per-format Record shape — the 5v5 pool has
    // real upgrades and the 5v5 rank has real games. Reloading must preserve
    // them exactly (the legacy branch must not run).
    stubStorage({
      [KEY]: JSON.stringify({
        playerId: 'p2',
        name: 'NewPilot',
        level: 25,
        xp: 10,
        coins: 9999,
        inventory: { powers: ['fire_bolt'], gear: ['iron_sword'] },
        presets: [{ id: 'y', name: 'y', createdAt: 0, slots: {} }],
        activePresetId: 'y',
        record: { wins: 5, losses: 4, matches: 9 },
        initiativeUpgrade: 2,
        ranks: {
          '1v1': { rating: 1150, games: 4 },
          '5v5': { rating: 1420, games: 9 },
        },
        rankedUpgrades: {
          '1v1': { attack: 3, defense: 1 },
          '5v5': { attack: 9, defense: 5 },
        },
        friends: [],
      }),
    });
    const store = await import('./store');
    const s = store.getState();
    expect(s.ranks['1v1']).toEqual({ rating: 1150, games: 4 });
    expect(s.ranks['5v5']).toEqual({ rating: 1420, games: 9 });
    expect(s.rankedUpgrades['1v1']).toEqual({ attack: 3, defense: 1 });
    expect(s.rankedUpgrades['5v5']).toEqual({ attack: 9, defense: 5 });
  });

  it('gives a brand-new player fresh ladders on both formats', async () => {
    stubStorage({});
    const store = await import('./store');
    const s = store.getState();
    expect(s.ranks['1v1']).toEqual({ rating: 1000, games: 0 });
    expect(s.ranks['5v5']).toEqual({ rating: 1000, games: 0 });
    expect(s.rankedUpgrades['1v1']).toEqual({ attack: 0, defense: 0 });
    expect(s.rankedUpgrades['5v5']).toEqual({ attack: 0, defense: 0 });
  });
});
