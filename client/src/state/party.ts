import { useSyncExternalStore } from 'react';
import type { PartyInfo, ServerMessage } from '../../../shared/src/types';
import { getWsStatus, sendMessage, subscribeMessages, subscribeWsStatus } from '../services/ws';
import { addFriend, getActivePreset, getState, subscribePlayer } from './store';

// ------------------------------------------------------------
// Party state (session-scoped, NOT persisted).
// The server is authoritative: every party_update arrives from it.
// ------------------------------------------------------------

export interface PartyInvite {
  partyId: string;
  fromId: string;
  fromName: string;
}

export interface PartyState {
  party: PartyInfo | null;
  invites: PartyInvite[];
  lastLookup: { name: string; online: boolean } | null;
}

let state: PartyState = { party: null, invites: [], lastLookup: null };

// If the user invites before a party exists, create one and flush the invite
// once the server confirms it.
let pendingInvite: { targetName?: string; targetPlayerId?: string } | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function getPartyState(): PartyState {
  return state;
}

export function subscribeParty(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useParty(): PartyState {
  return useSyncExternalStore(subscribeParty, getPartyState);
}

// ------------------------------------------------------------
// Presence: tell the server who we are every time we connect,
// so friends can find us and invite us by name.
// ------------------------------------------------------------
let wasConnected = false;
subscribeWsStatus(() => {
  const nowConnected = getWsStatus() === 'connected';
  if (nowConnected && !wasConnected) {
    const p = getState();
    if (p.playerId) sendMessage({ type: 'hello', playerId: p.playerId, name: p.name });
  }
  wasConnected = nowConnected;
});

// ------------------------------------------------------------
// Server messages
// ------------------------------------------------------------
subscribeMessages((msg: ServerMessage) => {
  switch (msg.type) {
    case 'party_update':
      state = { ...state, party: msg.party, invites: [] };
      if (pendingInvite) {
        sendMessage({ type: 'party_invite', playerId: getState().playerId, ...pendingInvite });
        pendingInvite = null;
      }
      emit();
      break;
    case 'party_disbanded':
      state = { party: null, invites: state.invites.filter((i) => i.partyId !== msg.partyId), lastLookup: state.lastLookup };
      emit();
      break;
    case 'party_invite':
      state = {
        ...state,
        invites: [...state.invites.filter((i) => i.partyId !== msg.partyId), { partyId: msg.partyId, fromId: msg.fromId, fromName: msg.fromName }],
      };
      emit();
      break;
    case 'player_lookup_result':
      state = { ...state, lastLookup: { name: msg.name, online: msg.online } };
      if (msg.online) {
        addFriend({ playerId: msg.playerId, name: msg.name });
      }
      emit();
      break;
  }
});

// ------------------------------------------------------------
// Actions
// ------------------------------------------------------------

function mySetup() {
  const p = getState();
  return {
    preset: getActivePreset(),
    initiativeUpgrade: p.initiativeUpgrade,
    rankedUpgrades: p.rankedUpgrades,
    rating: p.rank.rating,
  };
}

// ------------------------------------------------------------
// Build re-sync: while in a party, push our current build/upgrades to the
// server whenever they change — from ANY screen (not just Play) — so the
// leader can never queue us with a stale preset.
// ------------------------------------------------------------
let lastBuildSig: string | null = null;
function buildSig(): string {
  const p = getState();
  const preset = getActivePreset();
  return JSON.stringify([p.activePresetId, preset.slots, p.initiativeUpgrade, p.rankedUpgrades, p.rank.rating]);
}
subscribePlayer(() => {
  if (!state.party) {
    lastBuildSig = null;
    return;
  }
  const sig = buildSig();
  if (lastBuildSig !== null && sig !== lastBuildSig) {
    sendMessage({ type: 'party_setup', playerId: getState().playerId, partyId: state.party.partyId, ...mySetup() });
  }
  lastBuildSig = sig;
});

export function createParty(): void {
  sendMessage({ type: 'create_party', playerId: getState().playerId, ...mySetup() });
}

function sendOrQueueInvite(target: { targetName?: string; targetPlayerId?: string }): void {
  if (state.party) {
    sendMessage({ type: 'party_invite', playerId: getState().playerId, ...target });
  } else {
    // Create the party first, then invite once the server confirms it exists.
    pendingInvite = target;
    createParty();
  }
}

export function inviteByName(name: string): void {
  sendOrQueueInvite({ targetName: name });
}

export function inviteFriend(playerId: string): void {
  sendOrQueueInvite({ targetPlayerId: playerId });
}

export function acceptInvite(partyId: string): void {
  sendMessage({ type: 'party_accept', playerId: getState().playerId, partyId, ...mySetup() });
}

export function declineInvite(partyId: string): void {
  state = { ...state, invites: state.invites.filter((i) => i.partyId !== partyId) };
  emit();
  sendMessage({ type: 'party_decline', playerId: getState().playerId, partyId });
}

export function leaveParty(): void {
  const partyId = state.party?.partyId;
  state = { ...state, party: null };
  emit();
  if (partyId) sendMessage({ type: 'party_leave', playerId: getState().playerId, partyId });
}

export function kickMember(targetId: string): void {
  const partyId = state.party?.partyId;
  if (partyId) sendMessage({ type: 'party_kick', playerId: getState().playerId, partyId, targetId });
}

/** Toggle your ready state. Everyone must be ready before the leader can queue. */
export function setReady(ready: boolean): void {
  const partyId = state.party?.partyId;
  if (!partyId) return;
  sendMessage({ type: 'party_set_ready', playerId: getState().playerId, partyId, ready });
}

/** Push your current build/upgrades to the server so the leader can queue you. */
export function syncPartySetup(): void {
  const partyId = state.party?.partyId;
  if (!partyId) return;
  sendMessage({ type: 'party_setup', playerId: getState().playerId, partyId, ...mySetup() });
}

/** Queue the whole party (leader only — the server queues every member). */
export function queueParty(teamSize: 1 | 2 | 5, mode: 'unranked' | 'ranked'): void {
  const p = getState();
  const partyId = state.party?.partyId;
  sendMessage({
    type: 'join_queue',
    playerId: p.playerId,
    name: p.name,
    teamSize,
    mode,
    preset: getActivePreset(),
    initiativeUpgrade: p.initiativeUpgrade,
    rankedUpgrades: p.rankedUpgrades,
    rating: p.rank.rating,
    partyId,
  });
}
