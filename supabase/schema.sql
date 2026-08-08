-- ============================================================================
-- BuildCraft PvP — Supabase database schema
-- ============================================================================
-- HOW TO USE
--   1. Create a project at https://supabase.com
--   2. Supabase Dashboard → SQL Editor → New query → paste this whole file → Run
--   3. Authentication → Providers → enable "Email" (email/password)
--   4. Authentication → URL Configuration → add your localhost site URL
--   5. Settings → API → copy Project URL + anon key (+ service role key for the server)
--
-- This file is idempotent-ish (create if not exists) and safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES — one row per auth.users account; holds ALL persistent game data.
--    jsonb columns keep the schema flexible as the game grows.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  username            text not null unique,
  coins               integer not null default 1000 check (coins >= 0),
  level               integer not null default 1 check (level >= 1),
  xp                  integer not null default 0 check (xp >= 0),
  wins                integer not null default 0,
  losses              integer not null default 0,
  matches             integer not null default 0,
  initiative_upgrade  integer not null default 0 check (initiative_upgrade >= 0),
  -- Per-format ranked ladders (1v1 / 5v5) — separate rating + games.
  ranks               jsonb not null default '{"1v1":{"rating":850,"games":0},"5v5":{"rating":850,"games":0}}'::jsonb,
  -- Per-format coin-bought ranked upgrades (attack/defense), capped by rank.
  ranked_upgrades     jsonb not null default '{"1v1":{"attack":0,"defense":0},"5v5":{"attack":0,"defense":0}}'::jsonb,
  -- Owned items: { powers: string[], gear: string[], potions: string[] }
  inventory           jsonb not null default '{"powers":["fire_bolt"],"gear":["iron_sword"],"potions":["minor_healing_potion"]}'::jsonb,
  -- The player's saved Power Presets (array of Preset objects).
  presets             jsonb not null default '[]'::jsonb,
  active_preset_id    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- ----------------------------------------------------------------------------
-- Auto-create a profile with a starter kit the moment a user signs up.
-- Username comes from signUp options.data.username; falls back to a generated
-- pilot_<hex> name; uniqueness collisions get a numeric suffix.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  base_username text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), '');
  final_username text;
begin
  if base_username = '' or length(base_username) < 3 then
    base_username := 'pilot_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  final_username := base_username;
  while exists (select 1 from public.profiles where lower(username) = lower(final_username)) loop
    final_username := base_username || floor(random() * 900 + 100)::int::text;
  end loop;
  insert into public.profiles (id, username, coins, inventory, presets, active_preset_id, ranks, ranked_upgrades)
  values (
    new.id,
    final_username,
    1000,
    '{"powers":["fire_bolt"],"gear":["iron_sword"],"potions":["minor_healing_potion"]}'::jsonb,
    ('[{"id":"preset_starter","name":"Starter","createdAt":' || floor(extract(epoch from now()))::bigint::text ||
     ',"slots":{"core":null,"active1":"fire_bolt","active2":null,"passive1":null,"passive2":null,' ||
     '"weapon":"iron_sword","armor":null,"utility":null,"ultimate":null,' ||
     '"potion1":"minor_healing_potion","potion2":null,"potion3":null}}]')::jsonb,
    'preset_starter',
    '{"1v1":{"rating":850,"games":0},"5v5":{"rating":850,"games":0}}'::jsonb,
    '{"1v1":{"attack":0,"defense":0},"5v5":{"attack":0,"defense":0}}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- updated_at helper (shared by profiles + friend_requests)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. FRIENDS — a mutual, two-directional pair of rows (created only by the
--    accept trigger below, never by direct client inserts).
-- ----------------------------------------------------------------------------
create table if not exists public.friends (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  friend_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- ----------------------------------------------------------------------------
-- 3. FRIEND REQUESTS — pending → accepted/declined. Accepting auto-creates
--    the mutual friend rows.
-- ----------------------------------------------------------------------------
create table if not exists public.friend_requests (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (sender_id, receiver_id),
  check (sender_id <> receiver_id)
);

create index if not exists friend_requests_receiver_pending_idx
  on public.friend_requests (receiver_id) where status = 'pending';

drop trigger if exists friend_requests_set_updated_at on public.friend_requests;
create trigger friend_requests_set_updated_at
  before update on public.friend_requests
  for each row execute procedure public.set_updated_at();

-- Accepting a request creates both friendship rows.
create or replace function public.on_friend_request_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.friends (user_id, friend_id)
    values (new.sender_id, new.receiver_id), (new.receiver_id, new.sender_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists friend_requests_accept on public.friend_requests;
create trigger friend_requests_accept
  after update of status on public.friend_requests
  for each row execute procedure public.on_friend_request_update();

-- ----------------------------------------------------------------------------
-- 4. MATCH HISTORY (architected; V1 uses it for the ledger)
-- ----------------------------------------------------------------------------
create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  mode        text not null,               -- practice | unranked | ranked | custom
  team_size   integer not null,            -- 1 | 2 | 5
  winner_team integer,
  created_at  timestamptz not null default now()
);

create table if not exists public.match_participants (
  match_id   uuid not null references public.matches (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  team       integer not null,
  result     text check (result in ('victory', 'defeat', 'draw')),
  kills      integer not null default 0,
  coins      integer not null default 0,
  xp         integer not null default 0,
  rank_delta integer,
  primary key (match_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.friends          enable row level security;
alter table public.friend_requests  enable row level security;
alter table public.matches          enable row level security;
alter table public.match_participants enable row level security;

-- profiles: each user sees/updates only their own row.
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id);

-- The client saves its profile with `upsert ... onConflict(id)`, which
-- PostgREST executes as INSERT ... ON CONFLICT DO UPDATE — that needs an
-- INSERT policy too (INSERT + UPDATE), or every save fails RLS with
-- "new row violates row-level security policy". New rows created here are
-- always the user's own row (the signup trigger seeds it first).
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- friends: read/remove your own list. Inserts are trigger-only (accept).
drop policy if exists "friends select own" on public.friends;
create policy "friends select own" on public.friends
  for select using (auth.uid() = user_id);

drop policy if exists "friends delete own" on public.friends;
create policy "friends delete own" on public.friends
  for delete using (auth.uid() = user_id);

-- friend_requests: only the two people involved can see/act on a request.
drop policy if exists "requests select involved" on public.friend_requests;
create policy "requests select involved" on public.friend_requests
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "requests insert as sender" on public.friend_requests;
create policy "requests insert as sender" on public.friend_requests
  for insert with check (auth.uid() = sender_id);

drop policy if exists "requests update as receiver" on public.friend_requests;
create policy "requests update as receiver" on public.friend_requests
  for update using (auth.uid() = receiver_id);

drop policy if exists "requests delete involved" on public.friend_requests;
create policy "requests delete involved" on public.friend_requests
  for delete using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- matches: only participants can read a match record.
drop policy if exists "matches select involved" on public.matches;
create policy "matches select involved" on public.matches
  for select using (
    exists (
      select 1 from public.match_participants mp
      where mp.match_id = matches.id and mp.user_id = auth.uid()
    )
  );

drop policy if exists "match_participants select own" on public.match_participants;
create policy "match_participants select own" on public.match_participants
  for select using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. SECURITY-DEFINER RPCs (safe, targeted reads — no stats leak)
-- ----------------------------------------------------------------------------

-- Find a user by exact username (case-insensitive). Returns ONLY id + username.
create or replace function public.find_user_by_username(search text)
returns table (id uuid, username text)
language sql
security definer set search_path = ''
as $$
  select p.id, p.username
  from public.profiles p
  where lower(p.username) = lower(trim(search))
  limit 1;
$$;

grant execute on function public.find_user_by_username(text) to authenticated;

-- My friend list (with usernames).
create or replace function public.get_friends()
returns table (friend_id uuid, username text, created_at timestamptz)
language sql
security definer set search_path = ''
as $$
  select f.friend_id, p.username, f.created_at
  from public.friends f
  join public.profiles p on p.id = f.friend_id
  where f.user_id = auth.uid()
  order by p.username;
$$;

grant execute on function public.get_friends() to authenticated;

-- My friend requests (incoming + outgoing) with usernames.
create or replace function public.get_friend_requests()
returns table (
  id uuid, sender_id uuid, sender_name text,
  receiver_id uuid, receiver_name text, status text, created_at timestamptz
)
language sql
security definer set search_path = ''
as $$
  select fr.id, fr.sender_id, s.username, fr.receiver_id, r.username, fr.status, fr.created_at
  from public.friend_requests fr
  join public.profiles s on s.id = fr.sender_id
  join public.profiles r on r.id = fr.receiver_id
  where (fr.sender_id = auth.uid() or fr.receiver_id = auth.uid())
    and fr.status = 'pending'
  order by fr.created_at desc;
$$;

grant execute on function public.get_friend_requests() to authenticated;

-- Remove a friendship: deletes BOTH mutual rows. RLS alone can't do this
-- (each user may only touch their own row), hence the security-definer RPC.
create or replace function public.remove_friend(target_id uuid)
returns void
language sql
security definer set search_path = ''
as $$
  delete from public.friends
  where (user_id = auth.uid() and friend_id = target_id)
     or (user_id = target_id and friend_id = auth.uid());
$$;

grant execute on function public.remove_friend(uuid) to authenticated;
