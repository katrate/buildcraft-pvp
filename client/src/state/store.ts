import { useSyncExternalStore } from 'react';
import {
  INITIATIVE_UPGRADE,
  RANKED_UNLOCK_LEVEL,
  RANKED_UPGRADE,
  STARTER,
} from '../../../shared/src/constants';
import { GEAR } from '../../../shared/src/game-data/gear';
import { POTIONS } from '../../../shared/src/game-data/potions';
import { POWERS } from '../../../shared/src/game-data/powers';
import { addXp, applyRankDelta as applyRankDeltaPure, maxRankedUpgradeFor, rankForRating } from '../../../shared/src/progression';
import { START_RATING } from '../../../shared/src/rating';
import { initiativeUpgradeCost, rankedUpgradeCost } from '../../../shared/src/engine/stats';
import { tierForRating } from '../../../shared/src/rating';
import type { Friend, MatchRewards, PlayerRank, PlayerState, Preset, RankedFormat, RankedUpgrades, SlotId, StatId } from '../../../shared/src/types';

const STORAGE_KEY = 'buildcraft_pvp_state_v1';

function newPlayerId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

export function defaultState(): PlayerState {
  return {
    playerId: newPlayerId(),
    name: '',
    level: 1,
    xp: 0,
    coins: STARTER.coins,
    inventory: {
      powers: [...STARTER.ownedPowers],
      gear: [...STARTER.ownedGear],
      potions: [...STARTER.ownedPotions],
    },
    presets: [
      {
        id: 'preset_starter',
        name: STARTER.presetName,
        slots: { ...STARTER.presetSlots },
        createdAt: Date.now(),
      },
    ],
    activePresetId: 'preset_starter',
    record: { wins: 0, losses: 0, matches: 0 },
    initiativeUpgrade: 0,
    ranks: {
      '1v1': { rating: START_RATING, games: 0 },
      '5v5': { rating: START_RATING, games: 0 },
    },
    rankedUpgrades: {
      '1v1': { attack: 0, defense: 0 },
      '5v5': { attack: 0, defense: 0 },
    },
    friends: [],
  };
}

function load(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as PlayerState;
    if (!parsed.playerId || !parsed.presets || !parsed.inventory) return defaultState();
    const merged = { ...defaultState(), ...parsed };
    // --- Migration: older saves predate the potion bag — always make sure the
    // inventory carries the potions array (empty is fine; the Starter potion
    // is only granted to brand-new accounts).
    merged.inventory = {
      powers: [...(parsed.inventory.powers ?? [])],
      gear: [...(parsed.inventory.gear ?? [])],
      potions: [...(parsed.inventory.potions ?? [])],
    };
    // --- Migration: pre-format saves had a SINGLE `rank` + `rankedUpgrades`
    // (flat shapes). Their progress carries over to the 5v5 ladder (the format
    // that was live); the 1v1 ladder starts fresh at the base rating. Both are
    // rebuilt wholesale ONLY when the legacy flat shape is present — saves that
    // already use the per-format Record shape are never touched (so re-loading
    // can never wipe a ladder).
    const legacy = parsed as unknown as {
      rank?: PlayerRank | { tier?: number; points?: number };
      rankedUpgrades?: RankedUpgrades;
    };
    const lr = legacy.rank;
    const lu = legacy.rankedUpgrades;
    if (lr && typeof lr === 'object' && !('5v5' in lr)) {
      const asRank = lr as PlayerRank;
      const asTier = lr as { tier?: number; points?: number };
      merged.ranks = {
        '1v1': { rating: START_RATING, games: 0 },
        '5v5':
          typeof asRank.rating === 'number'
            ? asRank
            : { rating: START_RATING + (asTier.tier ?? 0) * 200, games: 0 }, // old tier/points ladder -> ELO
      };
    }
    if (lu && typeof lu === 'object' && !('5v5' in lu)) {
      // HP ranked upgrades were removed — strip the legacy field from old saves.
      merged.rankedUpgrades = {
        '1v1': { attack: 0, defense: 0 },
        '5v5': { attack: lu.attack ?? 0, defense: lu.defense ?? 0 },
      };
    }
    // The old UI allowed gear in the wrong slot (a sword in the armor slot).
    // The server rejects such presets, so auto-drop mismatched gear on load.
    merged.presets = merged.presets.map((p) => {
      const slots: Record<string, string | null> = {};
      for (const [slot, itemId] of Object.entries(p.slots)) {
        if (!itemId) continue;
        const g = GEAR[itemId];
        if (g && g.slot !== slot) continue; // drop gear that doesn't fit its slot
        slots[slot] = itemId;
      }
      return { ...p, slots };
    });
    return merged;
  } catch {
    return defaultState();
  }
}

let state: PlayerState = load();
const listeners = new Set<() => void>();

// ------------------------------------------------------------
// Persistence hooks — Supabase sync registers here (auth.ts). Every change
// is still written to localStorage first (offline cache + dev mode), then
// each hook is notified so the DB copy can catch up. Hooks are fire-and-
// forget: the game never waits on the network.
// ------------------------------------------------------------
type SaveHook = (s: PlayerState) => void;
const saveHooks = new Set<SaveHook>();

export function registerSaveHook(fn: SaveHook): () => void {
  saveHooks.add(fn);
  return () => saveHooks.delete(fn);
}

function emit(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full / private mode — keep in-memory state */
  }
  for (const fn of saveHooks) fn(state);
  for (const fn of listeners) fn();
}

export function getState(): PlayerState {
  return state;
}

export function subscribePlayer(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePlayer(): PlayerState {
  return useSyncExternalStore(subscribePlayer, getState);
}

// ------------------------------------------------------------
// Mutations
// ------------------------------------------------------------

export function setName(name: string): void {
  state = { ...state, name: name.trim().slice(0, 24) };
  emit();
}

/**
 * Replace the whole player state — used when an account's profile loads from
 * Supabase (id becomes the auth user id, name becomes the username).
 */
export function replaceState(next: PlayerState): void {
  state = { ...next };
  emit();
}

/** Replace the friend list (kept in PlayerState so existing UIs keep working). */
export function setFriendsList(friends: Friend[]): void {
  state = { ...state, friends };
  emit();
}

export function grantRewards(r: MatchRewards): { leveledUp: boolean } {
  const { level, xp, leveledUp } = addXp(state.level, state.xp, r.xp);
  state = {
    ...state,
    level,
    xp,
    coins: state.coins + r.coins,
  };
  emit();
  return { leveledUp };
}

export function recordMatch(result: 'victory' | 'defeat' | 'draw'): void {
  const victory = result === 'victory';
  const draw = result === 'draw';
  state = {
    ...state,
    record: {
      ...state.record,
      matches: state.record.matches + 1,
      wins: state.record.wins + (victory ? 1 : 0),
      losses: state.record.losses + (!victory && !draw ? 1 : 0),
    },
  };
  emit();
}

export function buyItem(kind: 'powers' | 'gear' | 'potions', id: string): boolean {
  const def = kind === 'powers' ? POWERS[id] : kind === 'gear' ? GEAR[id] : POTIONS[id];
  if (!def) return false;
  if (state.coins < def.price) return false;
  if (state.inventory[kind].includes(id)) return false;
  state = {
    ...state,
    coins: state.coins - def.price,
    inventory: { ...state.inventory, [kind]: [...state.inventory[kind], id] },
  };
  emit();
  return true;
}

export function ownsItem(kind: 'powers' | 'gear' | 'potions', id: string): boolean {
  return state.inventory[kind].includes(id);
}

export function getActivePreset(): Preset {
  return state.presets.find((p) => p.id === state.activePresetId) ?? state.presets[0];
}

export function savePreset(preset: Preset): void {
  const idx = state.presets.findIndex((p) => p.id === preset.id);
  const presets = idx >= 0 ? state.presets.map((p, i) => (i === idx ? preset : p)) : [...state.presets, preset];
  state = { ...state, presets };
  emit();
}

export function newPreset(name: string): Preset {
  const preset: Preset = {
    id: `preset_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    name: name.slice(0, 24),
    slots: {},
    createdAt: Date.now(),
  };
  state = { ...state, presets: [...state.presets, preset], activePresetId: preset.id };
  emit();
  return preset;
}

export function deletePreset(id: string): void {
  if (state.presets.length <= 1) return;
  const presets = state.presets.filter((p) => p.id !== id);
  state = {
    ...state,
    presets,
    activePresetId: state.activePresetId === id ? presets[0].id : state.activePresetId,
  };
  emit();
}

export function setActivePreset(id: string): void {
  state = { ...state, activePresetId: id };
  emit();
}

export function equipSlot(presetId: string, slot: SlotId, itemId: string | null): void {
  const preset = state.presets.find((p) => p.id === presetId);
  if (!preset) return;
  const slots = { ...preset.slots };
  if (itemId === null) delete slots[slot];
  else slots[slot] = itemId;
  savePreset({ ...preset, slots });
}

// ------------------------------------------------------------
// Initiative upgrade — coin-bought, applies everywhere, NOT
// normalized in unranked. Cost creeps up each level.
// ------------------------------------------------------------
export function upgradeInitiative(): boolean {
  const level = state.initiativeUpgrade;
  if (level >= INITIATIVE_UPGRADE.maxLevel) return false;
  const cost = initiativeUpgradeCost(level);
  if (state.coins < cost) return false;
  state = {
    ...state,
    coins: state.coins - cost,
    initiativeUpgrade: level + 1,
  };
  emit();
  return true;
}

export function initiativeUpgradeCostNext(): number {
  return initiativeUpgradeCost(state.initiativeUpgrade);
}

// ------------------------------------------------------------
// Ranked stat upgrades — coins, apply ONLY in ranked matches.
// Each ranked FORMAT has its own pool, and that format's rank caps
// how far each stat can go.
// ------------------------------------------------------------
export function upgradeRanked(stat: keyof RankedUpgrades, format: RankedFormat): boolean {
  const level = state.rankedUpgrades[format][stat];
  const ceiling = Math.min(RANKED_UPGRADE.maxLevel, maxRankedUpgradeFor(tierForRating(state.ranks[format].rating)));
  if (level >= ceiling) return false;
  const cost = rankedUpgradeCost(stat as StatId, level);
  if (state.coins < cost) return false;
  state = {
    ...state,
    coins: state.coins - cost,
    rankedUpgrades: {
      ...state.rankedUpgrades,
      [format]: { ...state.rankedUpgrades[format], [stat]: level + 1 },
    },
  };
  emit();
  return true;
}

export function rankedUpgradeCostNext(stat: keyof RankedUpgrades, format: RankedFormat): number {
  return rankedUpgradeCost(stat as StatId, state.rankedUpgrades[format][stat]);
}

// ------------------------------------------------------------
// Ranked ladders (per format)
// ------------------------------------------------------------
// Apply a server-computed ELO rating delta (can be negative) to one ladder.
// NOTE (V1 trust model): the rating itself lives in the browser; a real
// accounts backend must store ratings server-side and verify them.
export function applyRankDelta(delta: number, format: RankedFormat): PlayerRank {
  state = {
    ...state,
    ranks: { ...state.ranks, [format]: applyRankDeltaPure(state.ranks[format], delta) },
  };
  emit();
  return state.ranks[format];
}

// Dev tool: jump straight to the ranked-unlock threshold (levels themselves
// are endless — this only reaches the unlock, it is not a cap). Never lowers
// an already-higher level, so it is safe to click at any time.
export function setDevUnlockRanked(): void {
  state = { ...state, level: Math.max(state.level, RANKED_UNLOCK_LEVEL), xp: state.xp };
  emit();
}

export function currentRank(format: RankedFormat): PlayerRank {
  return state.ranks[format];
}

export function currentRankName(format: RankedFormat): string {
  return rankForRating(state.ranks[format].rating).name;
}

// ------------------------------------------------------------
// Friends (locally stored — no accounts in V1).
// ------------------------------------------------------------

export function addFriend(friend: Friend): boolean {
  if (!friend.playerId || state.friends.some((f) => f.playerId === friend.playerId)) return false;
  state = { ...state, friends: [...state.friends, { playerId: friend.playerId, name: friend.name }] };
  emit();
  return true;
}

export function removeFriend(playerId: string): void {
  state = { ...state, friends: state.friends.filter((f) => f.playerId !== playerId) };
  emit();
}

export function resetAll(): void {
  state = defaultState();
  emit();
}
