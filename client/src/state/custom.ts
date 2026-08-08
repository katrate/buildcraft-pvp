import { useSyncExternalStore } from 'react';
import type { CustomLobbyInfo, CustomNorm, ServerMessage } from '../../../shared/src/types';
import { getWsStatus, sendMessage, subscribeMessages, subscribeWsStatus } from '../services/ws';
import { getActivePreset, getState, subscribePlayer } from './store';

// ------------------------------------------------------------
// Custom-lobby state (session-scoped). The server is authoritative:
// every custom_update arrives from it.
// ------------------------------------------------------------

export interface CustomInvite {
  lobbyId: string;
  fromId: string;
  fromName: string;
}

export interface CustomState {
  lobby: CustomLobbyInfo | null;
  invites: CustomInvite[];
}

let state: CustomState = { lobby: null, invites: [] };

// If the user invites before a lobby exists, create one and flush the invite
// once the server confirms it.
let pendingInvite: { targetName?: string; targetPlayerId?: string } | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function getCustomState(): CustomState {
  return state;
}

export function subscribeCustom(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useCustom(): CustomState {
  return useSyncExternalStore(subscribeCustom, getCustomState);
}

// Presence is shared with the party store's hello-on-connect flow (the server
// registers every player on 'hello'), so no extra wiring is needed here.

// ------------------------------------------------------------
// Server messages
// ------------------------------------------------------------
subscribeMessages((msg: ServerMessage) => {
  switch (msg.type) {
    case 'custom_update':
      state = { ...state, lobby: msg.lobby, invites: [] };
      if (pendingInvite) {
        sendMessage({ type: 'custom_invite', playerId: getState().playerId, ...pendingInvite });
        pendingInvite = null;
      }
      emit();
      break;
    case 'custom_disbanded':
      state = { lobby: null, invites: state.invites.filter((i) => i.lobbyId !== msg.lobbyId) };
      emit();
      break;
    case 'custom_invite':
      state = {
        ...state,
        invites: [...state.invites.filter((i) => i.lobbyId !== msg.lobbyId), { lobbyId: msg.lobbyId, fromId: msg.fromId, fromName: msg.fromName }],
      };
      emit();
      break;
  }
});

// ------------------------------------------------------------
// Actions
// ------------------------------------------------------------

function mySetup() {
  const p = getState();
  // Custom matches are fully normalized (ranked upgrades never apply), so the
  // payload just carries a stable pool — the 5v5 ladder's data is the default.
  return {
    preset: getActivePreset(),
    initiativeUpgrade: p.initiativeUpgrade,
    rankedUpgrades: p.rankedUpgrades['5v5'],
    rating: p.ranks['5v5'].rating,
  };
}

// Build re-sync: while in a lobby, push our current build/upgrades whenever
// they change so the leader can never start with a stale preset.
let lastBuildSig: string | null = null;
function buildSig(): string {
  const p = getState();
  const preset = getActivePreset();
  return JSON.stringify([p.activePresetId, preset.slots, p.initiativeUpgrade, p.rankedUpgrades, p.ranks]);
}
subscribePlayer(() => {
  if (!state.lobby) {
    lastBuildSig = null;
    return;
  }
  const sig = buildSig();
  if (lastBuildSig !== null && sig !== lastBuildSig) {
    sendMessage({ type: 'custom_setup', playerId: getState().playerId, lobbyId: state.lobby.lobbyId, ...mySetup() });
  }
  lastBuildSig = sig;
});

export function createCustomLobby(): void {
  sendMessage({ type: 'custom_create', playerId: getState().playerId, ...mySetup() });
}

function sendOrQueueInvite(target: { targetName?: string; targetPlayerId?: string }): void {
  if (state.lobby) {
    sendMessage({ type: 'custom_invite', playerId: getState().playerId, ...target });
  } else {
    pendingInvite = target;
    createCustomLobby();
  }
}

export function inviteCustomByName(name: string): void {
  sendOrQueueInvite({ targetName: name });
}

export function inviteCustomFriend(playerId: string): void {
  sendOrQueueInvite({ targetPlayerId: playerId });
}

export function acceptCustom(lobbyId: string): void {
  sendMessage({ type: 'custom_accept', playerId: getState().playerId, lobbyId, ...mySetup() });
}

export function declineCustom(lobbyId: string): void {
  state = { ...state, invites: state.invites.filter((i) => i.lobbyId !== lobbyId) };
  emit();
  sendMessage({ type: 'custom_decline', playerId: getState().playerId, lobbyId });
}

export function leaveCustomLobby(): void {
  const lobbyId = state.lobby?.lobbyId;
  state = { ...state, lobby: null };
  emit();
  if (lobbyId) sendMessage({ type: 'custom_leave', playerId: getState().playerId, lobbyId });
}

export function kickCustomMember(targetId: string): void {
  const lobbyId = state.lobby?.lobbyId;
  if (lobbyId) sendMessage({ type: 'custom_kick', playerId: getState().playerId, lobbyId, targetId });
}

export function setCustomTeam(targetId: string, team: 0 | 1): void {
  const lobbyId = state.lobby?.lobbyId;
  if (lobbyId) sendMessage({ type: 'custom_team', playerId: getState().playerId, lobbyId, targetId, team });
}

export function setCustomNorm(norm: CustomNorm): void {
  const lobbyId = state.lobby?.lobbyId;
  if (lobbyId) sendMessage({ type: 'custom_norm', playerId: getState().playerId, lobbyId, norm });
}

export function startCustomMatch(): void {
  const lobbyId = state.lobby?.lobbyId;
  if (lobbyId) sendMessage({ type: 'custom_start', playerId: getState().playerId, lobbyId });
}

/** Push your current build/upgrades to the server so the leader can start with them. */
export function syncCustomSetup(): void {
  const lobbyId = state.lobby?.lobbyId;
  if (!lobbyId) return;
  sendMessage({ type: 'custom_setup', playerId: getState().playerId, lobbyId, ...mySetup() });
}
