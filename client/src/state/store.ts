import { useSyncExternalStore } from 'react';
import {
  INITIATIVE_UPGRADE,
  RANKED_UNLOCK_LEVEL,
  RANKED_UPGRADE,
  STARTER,
} from '../../../shared/src/constants';
import { GEAR } from '../../../shared/src/game-data/gear';
import { POWERS } from '../../../shared/src/game-data/powers';
import { addXp, applyRankDelta as applyRankDeltaPure, maxRankedUpgradeFor, rankForRating } from '../../../shared/src/progression';
import { START_RATING } from '../../../shared/src/rating';
import { initiativeUpgradeCost, rankedUpgradeCost } from '../../../shared/src/engine/stats';
import { tierForRating } from '../../../shared/src/rating';
import type { Friend, MatchRewards, PlayerRank, PlayerState, Preset, RankedUpgrades, SlotId, StatId } from '../../../shared/src/types';

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
    rankedUpgrades: { attack: 0, defense: 0 },
    rank: { rating: START_RATING, games: 0 },
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
    // Migrate the old tier/points ladder (pre-rating) to an ELO rating.
    const oldRank = parsed.rank as unknown as { tier?: number; points?: number } | undefined;
    if (oldRank && typeof oldRank.tier === 'number' && typeof merged.rank.rating !== 'number') {
      merged.rank = { rating: START_RATING + (oldRank.tier ?? 0) * 200, games: 0 };
    }
    if (typeof merged.rank.rating !== 'number') merged.rank = { rating: START_RATING, games: 0 };
    // HP ranked upgrades were removed — strip the legacy field from old saves.
    merged.rankedUpgrades = {
      attack: merged.rankedUpgrades?.attack ?? 0,
      defense: merged.rankedUpgrades?.defense ?? 0,
    };
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

function emit(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full / private mode — keep in-memory state */
  }
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

export function buyItem(kind: 'powers' | 'gear', id: string): boolean {
  const def = kind === 'powers' ? POWERS[id] : GEAR[id];
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

export function ownsItem(kind: 'powers' | 'gear', id: string): boolean {
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
// Each rank caps how far a stat can go.
// ------------------------------------------------------------
export function upgradeRanked(stat: keyof RankedUpgrades): boolean {
  const level = state.rankedUpgrades[stat];
  const ceiling = Math.min(RANKED_UPGRADE.maxLevel, maxRankedUpgradeFor(tierForRating(state.rank.rating)));
  if (level >= ceiling) return false;
  const cost = rankedUpgradeCost(stat as StatId, level);
  if (state.coins < cost) return false;
  state = {
    ...state,
    coins: state.coins - cost,
    rankedUpgrades: { ...state.rankedUpgrades, [stat]: level + 1 },
  };
  emit();
  return true;
}

export function rankedUpgradeCostNext(stat: keyof RankedUpgrades): number {
  return rankedUpgradeCost(stat as StatId, state.rankedUpgrades[stat]);
}

// ------------------------------------------------------------
// Ranked ladder
// ------------------------------------------------------------
// Apply a server-computed ELO rating delta (can be negative).
// NOTE (V1 trust model): the rating itself lives in the browser; a real
// accounts backend must store ratings server-side and verify them.
export function applyRankDelta(delta: number): PlayerRank {
  state = { ...state, rank: applyRankDeltaPure(state.rank, delta) };
  emit();
  return state.rank;
}

// Dev tool: jump straight to the ranked-unlock threshold (levels themselves
// are endless — this only reaches the unlock, it is not a cap).
export function setDevUnlockRanked(): void {
  state = { ...state, level: RANKED_UNLOCK_LEVEL, xp: 0 };
  emit();
}

export function currentRank(): PlayerRank {
  return state.rank;
}

export function currentRankName(): string {
  return rankForRating(state.rank.rating).name;
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
