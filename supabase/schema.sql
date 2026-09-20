-- Vaultify cloud sync schema.
-- Run this once in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run.
--
-- The server only ever stores ciphertext and wrapped keys. Row Level Security
-- guarantees a signed-in user can only touch their own rows.

-- ---------------------------------------------------------------------------
-- vaults: one encrypted vault per user
-- ---------------------------------------------------------------------------
create table if not exists public.vaults (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  data                 text not null,          -- AES-GCM encrypted vault payload
  wrapped_dek_pw       text not null,          -- data key wrapped by the master-password key
  wrapped_dek_recovery text,                   -- data key wrapped by the recovery key
  version              bigint not null default 1,  -- optimistic-concurrency counter
  updated_at           timestamptz not null default now()
);

alter table public.vaults enable row level security;

drop policy if exists "vaults_select_own" on public.vaults;
drop policy if exists "vaults_insert_own" on public.vaults;
drop policy if exists "vaults_update_own" on public.vaults;
drop policy if exists "vaults_delete_own" on public.vaults;

create policy "vaults_select_own" on public.vaults
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "vaults_insert_own" on public.vaults
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "vaults_update_own" on public.vaults
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "vaults_delete_own" on public.vaults
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- login_events: append-only security activity feed
-- ---------------------------------------------------------------------------
create table if not exists public.login_events (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  event        text not null check (char_length(event) <= 40),
  device_id    text,
  device_label text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists login_events_user_created_idx
  on public.login_events (user_id, created_at desc);

alter table public.login_events enable row level security;

drop policy if exists "login_events_select_own" on public.login_events;
drop policy if exists "login_events_insert_own" on public.login_events;

create policy "login_events_select_own" on public.login_events
  for select to authenticated using ((select auth.uid()) = user_id);
-- No update/delete policies: events cannot be edited or erased by the client.
create policy "login_events_insert_own" on public.login_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
