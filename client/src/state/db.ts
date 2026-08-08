import { getSupabase } from '../lib/supabase';
import { defaultState } from './store';
import type { Friend, PlayerState } from '../../../shared/src/types';

// ------------------------------------------------------------
// Supabase <-> PlayerState mapping layer.
// The `profiles` table mirrors the client PlayerState (jsonb columns keep it
// flexible as the game grows). RLS lets each user read/update ONLY their own
// row, so the anon key is enough for everything the client does.
// ------------------------------------------------------------

export interface ProfileRow {
  id: string;
  username: string;
  coins: number;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  matches: number;
  initiative_upgrade: number;
  ranks: Record<'1v1' | '5v5', { rating: number; games: number }>;
  ranked_upgrades: Record<'1v1' | '5v5', { attack: number; defense: number }>;
  inventory: { powers: string[]; gear: string[]; potions: string[] };
  presets: unknown[];
  active_preset_id: string | null;
}

export interface FriendRequestRow {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  receiver_name: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

// ------------------------------------------------------------
// Mapping
// ------------------------------------------------------------

export function profileToState(row: ProfileRow): PlayerState {
  const base = defaultState();
  return {
    ...base,
    playerId: row.id,
    name: row.username,
    level: row.level,
    xp: row.xp,
    coins: row.coins,
    inventory: {
      powers: [...(row.inventory?.powers ?? [])],
      gear: [...(row.inventory?.gear ?? [])],
      potions: [...(row.inventory?.potions ?? [])],
    },
    presets: Array.isArray(row.presets) && row.presets.length > 0 ? (row.presets as PlayerState['presets']) : base.presets,
    activePresetId: row.active_preset_id ?? base.activePresetId,
    record: { wins: row.wins, losses: row.losses, matches: row.matches },
    initiativeUpgrade: row.initiative_upgrade ?? 0,
    ranks:
      row.ranks && row.ranks['1v1'] && row.ranks['5v5']
        ? { '1v1': row.ranks['1v1'], '5v5': row.ranks['5v5'] }
        : base.ranks,
    rankedUpgrades:
      row.ranked_upgrades && row.ranked_upgrades['1v1'] && row.ranked_upgrades['5v5']
        ? row.ranked_upgrades
        : base.rankedUpgrades,
    friends: [], // the friend list is loaded separately (get_friends RPC)
  };
}

export function stateToProfile(state: PlayerState): Omit<ProfileRow, 'id'> {
  return {
    username: state.name,
    coins: state.coins,
    level: state.level,
    xp: state.xp,
    wins: state.record.wins,
    losses: state.record.losses,
    matches: state.record.matches,
    initiative_upgrade: state.initiativeUpgrade,
    ranks: state.ranks,
    ranked_upgrades: state.rankedUpgrades,
    inventory: state.inventory,
    presets: state.presets as unknown[],
    active_preset_id: state.activePresetId,
  };
}

// ------------------------------------------------------------
// Profile load / save
// ------------------------------------------------------------

export async function loadProfileRow(userId: string): Promise<ProfileRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    console.warn('[db] loadProfileRow failed:', error.message);
    return null;
  }
  return (data as unknown as ProfileRow | null) ?? null;
}

/**
 * Persist the whole PlayerState row. Returns the row, or null when unconfigured.
 *
 * UPDATE-first: the client only ever writes the row that the signup trigger
 * already created, and the live RLS setup always ships a `profiles update own`
 * policy. PostgREST `.upsert()` runs as INSERT ... ON CONFLICT DO UPDATE which
 * ALSO needs an INSERT policy — if that policy hasn't been applied yet (or a
 * user's row is missing for any reason), every save would die with a 42501 RLS
 * error and progress would vanish on reload. Updating by primary key needs only
 * the UPDATE policy, so it works today; the upsert stays as a fallback for the
 * rare row-missing case (e.g. a broken signup trigger).
 */
export async function upsertProfile(state: PlayerState): Promise<ProfileRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const payload = { id: state.playerId, ...stateToProfile(state) };

  // Fast path: UPDATE the existing row (RLS 'profiles update own').
  const { data: upData, error: upErr } = await sb
    .from('profiles')
    .update(payload)
    .eq('id', state.playerId)
    .select();
  const upRow = Array.isArray(upData) && upData.length > 0 ? upData[0] : null;
  if (!upErr && upRow) {
    return upRow as unknown as ProfileRow;
  }

  // Fallback: row missing (update matched nothing) — try an upsert to seed it.
  const { data, error } = await sb.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.warn('[db] upsertProfile failed:', error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as unknown as ProfileRow | null) ?? null;
}

// ------------------------------------------------------------
// Friends — everything goes through the security-definer RPCs so a user can
// only ever read their own friendships, and adding a friend is a pure DB
// insert by username (no "must be online" requirement anymore).
// ------------------------------------------------------------

export interface FriendsData {
  friends: Friend[];
  incoming: FriendRequestRow[];
  outgoing: FriendRequestRow[];
}

export async function loadFriendsData(userId: string): Promise<FriendsData> {
  const empty: FriendsData = { friends: [], incoming: [], outgoing: [] };
  const sb = getSupabase();
  if (!sb) return empty;
  const [f, r] = await Promise.all([
    sb.rpc('get_friends'),
    sb.rpc('get_friend_requests'),
  ]);
  const friends: Friend[] = ((f.data as { friend_id: string; username: string }[] | null) ?? []).map((x) => ({
    playerId: x.friend_id,
    name: x.username,
  }));
  const reqs = (r.data as FriendRequestRow[] | null) ?? [];
  return {
    friends,
    incoming: reqs.filter((x) => x.receiver_id === userId),
    outgoing: reqs.filter((x) => x.sender_id === userId),
  };
}

export interface SendRequestResult {
  ok: boolean;
  error?: string;
}

/** Find a user by username and file a pending friend request. */
export async function sendFriendRequestByUsername(username: string, userId: string): Promise<SendRequestResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured — add your keys to client/.env.' };
  const clean = username.trim();
  if (!clean) return { ok: false, error: 'Enter a username.' };
  const { data: found, error: findErr } = await sb.rpc('find_user_by_username', { search: clean });
  if (findErr || !Array.isArray(found) || found.length === 0) {
    return { ok: false, error: `No player named "${clean}" exists.` };
  }
  const target = found[0] as { id: string; username: string };
  if (target.id === userId) return { ok: false, error: 'You cannot add yourself.' };
  const { error: insErr } = await sb.from('friend_requests').insert({ sender_id: userId, receiver_id: target.id });
  if (insErr) {
    const msg = insErr.message.toLowerCase();
    if (msg.includes('duplicate')) return { ok: false, error: 'A request to that player already exists.' };
    if (msg.includes('foreign key')) return { ok: false, error: 'That player no longer exists.' };
    return { ok: false, error: insErr.message };
  }
  return { ok: true };
}

export async function acceptFriendRequest(requestId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
  if (error) {
    console.warn('[db] acceptFriendRequest failed:', error.message);
    return false;
  }
  return true;
}

export async function declineFriendRequest(requestId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('friend_requests').update({ status: 'declined' }).eq('id', requestId);
  if (error) {
    console.warn('[db] declineFriendRequest failed:', error.message);
    return false;
  }
  return true;
}

/** Withdraw an outgoing request (sender deletes their own row). */
export async function cancelFriendRequest(requestId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('friend_requests').delete().eq('id', requestId);
  if (error) {
    console.warn('[db] cancelFriendRequest failed:', error.message);
    return false;
  }
  return true;
}

/** Remove a friendship — the RPC deletes BOTH mutual rows (RLS only lets you touch your own). */
export async function removeFriendById(friendId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.rpc('remove_friend', { target_id: friendId });
  if (error) {
    console.warn('[db] removeFriend failed:', error.message);
    return false;
  }
  return true;
}
