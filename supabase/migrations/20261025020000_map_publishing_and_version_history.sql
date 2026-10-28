-- Map System: Saved Maps, Publishing, Default Map, and Version History Migration
-- Safe and idempotent

-- 1. Ensure saved_maps has is_published and is_default columns
alter table if exists public.saved_maps 
  add column if not exists is_published boolean not null default false;

alter table if exists public.saved_maps 
  add column if not exists is_default boolean not null default false;

-- 2. Create map_version_history table (stores up to 10 versions per map)
create table if not exists public.map_version_history (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.saved_maps(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  version_number integer not null default 1,
  name text not null default 'Untitled Map',
  map_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Index for fast lookup by map_id and version order
create index if not exists idx_map_version_history_map_id on public.map_version_history(map_id, created_at desc);

-- 3. Row Level Security for map_version_history
alter table public.map_version_history enable row level security;

drop policy if exists "map version history owner access" on public.map_version_history;
create policy "map version history owner access" on public.map_version_history
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "map version history public read" on public.map_version_history;
create policy "map version history public read" on public.map_version_history
  for select using (true);

grant select, insert, update, delete on public.map_version_history to authenticated;
grant select, insert, update, delete on public.map_version_history to anon;

