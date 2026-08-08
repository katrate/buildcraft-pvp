import { useSyncExternalStore } from 'react';
import type { PvpMode } from '../../../shared/src/types';
import { sendMessage } from '../services/ws';
import { getPartyState } from './party';
import { getState } from './store';

// ------------------------------------------------------------
// Global matchmaking queue state.
//
// The queue LIVES at the app level — not inside the Play screen —
// so browsing the menu, store, build or any other screen keeps the
// search running in the background. A small floating timer chip is
// shown on top of every screen while queued; when a match is found
// the app switches to the countdown screen automatically.
// ------------------------------------------------------------

export interface GlobalQueue {
  teamSize: 1 | 2 | 5;
  mode: PvpMode;
  count: number; // how many players the server reports waiting
  queuedSince: number; // ms epoch — drives the wait timer
}

let queue: GlobalQueue | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function getQueue(): GlobalQueue | null {
  return queue;
}

export function subscribeQueue(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useQueue(): GlobalQueue | null {
  return useSyncExternalStore(subscribeQueue, getQueue);
}

export function setQueue(q: GlobalQueue | null): void {
  queue = q;
  emit();
}

export function clearQueue(): void {
  if (!queue) return;
  queue = null;
  emit();
}

/** Leave the queue (solo or whole party) and clear the global timer. */
export function leaveQueue(): void {
  const p = getState();
  sendMessage({ type: 'leave_queue', playerId: p.playerId, partyId: getPartyState().party?.partyId });
  clearQueue();
}
