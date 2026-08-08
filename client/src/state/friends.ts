import { useSyncExternalStore } from 'react';
import {
  acceptFriendRequest as dbAccept,
  cancelFriendRequest as dbCancel,
  declineFriendRequest as dbDecline,
  loadFriendsData,
  removeFriendById,
  sendFriendRequestByUsername,
  type FriendRequestRow,
} from './db';
import { getState, setFriendsList } from './store';
import { sendMessage, subscribeMessages } from '../services/ws';

// ------------------------------------------------------------
// Friends (Supabase-driven).
//
// The friend LIST lives in PlayerState.friends (existing UI reads it), and
// the pending request queues (incoming/outgoing) live here. Every mutation
// goes through the DB (RPCs + friend_requests table) and refreshes both.
// No player needs to be online to send/accept a request — it's pure DB.
// Online/offline status (the `online` set) is live server presence: the
// panel asks the server which friends are connected (refreshPresence) and
// the answers keep the dots current.
// ------------------------------------------------------------

export interface FriendsState {
  incoming: FriendRequestRow[];
  outgoing: FriendRequestRow[];
  loading: boolean;
  notice: { text: string; ok: boolean } | null;
  /** Friend ids currently connected — drives the online/offline dots. null = not queried yet. */
  online: string[] | null;
}

let state: FriendsState = { incoming: [], outgoing: [], loading: true, notice: null, online: null };

const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function getFriends(): FriendsState {
  return state;
}

export function subscribeFriends(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useFriends(): FriendsState {
  return useSyncExternalStore(subscribeFriends, getFriends);
}

// Server presence answers keep the online dots current (sent in response to
// refreshPresence's presence_query).
subscribeMessages((msg) => {
  if (msg.type === 'presence_result') {
    state = { ...state, online: msg.online };
    emit();
  }
});

/** Ask the server which of our friends are online right now. */
export function refreshPresence(): void {
  const me = getState().playerId;
  const friends = getState().friends;
  if (!me || friends.length === 0) {
    if (state.online !== null && state.online.length === 0) return;
    state = { ...state, online: [] };
    emit();
    return;
  }
  sendMessage({ type: 'presence_query', playerId: me, ids: friends.map((f) => f.playerId) });
}

// ------------------------------------------------------------
// Data
// ------------------------------------------------------------

/** Pull the friend list + request queues from Supabase (called on login). */
export async function refreshFriends(): Promise<void> {
  const me = getState().playerId;
  if (!me) return;
  const data = await loadFriendsData(me);
  setFriendsList(data.friends);
  state = { ...state, incoming: data.incoming, outgoing: data.outgoing, loading: false };
  emit();
  refreshPresence(); // friends changed — re-ask who's online
}

// ------------------------------------------------------------
// Actions
// ------------------------------------------------------------

export async function sendFriendRequest(username: string): Promise<boolean> {
  const me = getState().playerId;
  const res = await sendFriendRequestByUsername(username, me);
  state = {
    ...state,
    notice: {
      text: res.ok ? `Friend request sent to "${username.trim()}".` : (res.error ?? 'Request failed.'),
      ok: res.ok,
    },
  };
  emit();
  if (res.ok) void refreshFriends();
  return res.ok;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  await dbAccept(requestId);
  await refreshFriends();
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  await dbDecline(requestId);
  await refreshFriends();
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  await dbCancel(requestId);
  await refreshFriends();
}

/** Remove a friendship (deletes both mutual rows server-side). */
export async function removeFriend(friendId: string): Promise<void> {
  await removeFriendById(friendId);
  await refreshFriends();
}

/** Clear the transient notice after the UI has shown it. */
export function clearFriendNotice(): void {
  if (state.notice) {
    state = { ...state, notice: null };
    emit();
  }
}
