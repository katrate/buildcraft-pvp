import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { defaultState, registerSaveHook, replaceState } from './store';
import { loadProfileRow, profileToState, upsertProfile } from './db';
import { refreshFriends } from './friends';

// ------------------------------------------------------------
// Account auth (Supabase) — the mandatory identity layer.
//
// Accounts are REQUIRED: the game gate shows a login screen until a session
// exists, then the profile row hydrates into the local store and every change
// is debounce-synced back to Supabase. There is no anonymous/dev mode.
// If the client is not configured (client/.env missing), `unconfigured` flips
// and the app shows a setup screen instead of pretending to work.
// ------------------------------------------------------------

export type AuthStatus = 'unknown' | 'signed-out' | 'signed-in';

export interface AuthState {
  status: AuthStatus;
  /** true when VITE_SUPABASE_* env vars are missing — show a setup screen. */
  unconfigured: boolean;
  user: { id: string; username: string } | null;
  /** true once the account's profile has been loaded into the store. */
  hydrated: boolean;
}

let auth: AuthState = {
  status: isSupabaseConfigured() ? 'unknown' : 'signed-out',
  unconfigured: !isSupabaseConfigured(),
  user: null,
  hydrated: false,
};

let currentSession: Session | null = null;
let unregisterSave: (() => void) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function getAuth(): AuthState {
  return auth;
}

export function subscribeAuth(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribeAuth, getAuth);
}

/** Access token for the WebSocket handshake — the server requires it. */
export function getAccessToken(): string | null {
  return currentSession?.access_token ?? null;
}

// ------------------------------------------------------------
// Hydration: profile row -> local store, then keep the DB in sync.
// ------------------------------------------------------------

// Guards against overlapping hydrations (getSession vs onAuthStateChange): only
// the most recent call may apply its result.
let hydrateEpoch = 0;

async function hydrateWithSession(session: Session): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const epoch = ++hydrateEpoch;
  currentSession = session;
  const userId = session.user.id;
  const metaName = (session.user.user_metadata?.username as string | undefined) ?? '';

  let row = await loadProfileRow(userId);
  if (epoch !== hydrateEpoch) return; // a newer sign-in superseded us
  if (!row) {
    // A profile should already exist (created by the signup trigger), but if
    // it doesn't (old auth user / trigger disabled) seed one.
    const starter = defaultState();
    starter.playerId = userId;
    if (metaName) starter.name = metaName.slice(0, 24);
    row = await upsertProfile(starter);
    if (epoch !== hydrateEpoch) return;
  }

  // Re-register the save hook for THIS account — dropping any hook and any
  // queued save left behind by a previous account.
  if (unregisterSave) unregisterSave();
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  unregisterSave = registerSaveHook((s) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void upsertProfile(s);
    }, 800);
  });

  if (row) {
    replaceState(profileToState(row));
  } else {
    // DB unreachable: play on local defaults instead of dead-ending on
    // "Loading your fighter…". The debounced save hook keeps retrying, and
    // the next login re-syncs from the DB.
    const fallback = defaultState();
    fallback.playerId = userId;
    if (metaName) fallback.name = metaName.slice(0, 24);
    replaceState(fallback);
  }

  await refreshFriends();
  if (epoch !== hydrateEpoch) return;
  auth = {
    status: 'signed-in',
    unconfigured: false,
    user: { id: userId, username: row ? row.username : metaName || 'Pilot' },
    hydrated: true,
  };
  emit();
}

async function init(): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    auth = { status: 'signed-out', unconfigured: true, user: null, hydrated: false };
    emit();
    return;
  }
  const { data } = await sb.auth.getSession();
  if (data.session) {
    auth = { ...auth, status: 'signed-in' };
    emit();
    await hydrateWithSession(data.session);
  } else {
    auth = { status: 'signed-out', unconfigured: false, user: null, hydrated: false };
    emit();
  }
  sb.auth.onAuthStateChange((_event, session) => {
    if (session) {
      auth = { ...auth, status: 'signed-in' };
      emit();
      void hydrateWithSession(session);
    } else {
      if (unregisterSave) {
        unregisterSave();
        unregisterSave = null;
      }
      if (saveTimer) clearTimeout(saveTimer);
      currentSession = null;
      auth = { status: 'signed-out', unconfigured: false, user: null, hydrated: false };
      emit();
    }
  });
}
void init();

// ------------------------------------------------------------
// Actions
// ------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured — add your keys to client/.env.' };
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, error: error.message };
  // onAuthStateChange(SIGNED_IN) hydrates the profile — the app shows a
  // "loading your fighter" screen until hydrated flips true.
  return { ok: true };
}

export async function signUp(username: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured — add your keys to client/.env.' };
  if (username.trim().length < 3) return { ok: false, error: 'Username must be at least 3 characters.' };
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { username: username.trim().slice(0, 24) } },
  });
  if (error) {
    // The DB enforces unique usernames — translate the raw Postgres error.
    if (error.message.toLowerCase().includes('duplicate')) {
      return { ok: false, error: 'That username is already taken.' };
    }
    return { ok: false, error: error.message };
  }
  if (!data.session) {
    // Email confirmation is enabled: the account exists but needs a click.
    return { ok: false, error: 'Account created! Check your email to confirm it, then sign in.' };
  }
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  await sb?.auth.signOut();
  // The onAuthStateChange handler also fires; clear synchronously too.
  if (unregisterSave) {
    unregisterSave();
    unregisterSave = null;
  }
  if (saveTimer) clearTimeout(saveTimer);
  currentSession = null;
  auth = { status: 'signed-out', unconfigured: false, user: null, hydrated: false };
  emit();
}
