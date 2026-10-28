create table if not exists public.map_tiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'tiles',
  canvas_width integer not null,
  canvas_height integer not null,
  pixel_data jsonb not null default '{}'::jsonb,
  palette text[] not null default '{}',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.map_objects (like public.map_tiles including all);
alter table public.map_objects alter column category set default 'object';

-- Saved maps table
create table if not exists public.saved_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Untitled Map',
  map_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.map_tiles enable row level security;
alter table public.map_objects enable row level security;
alter table public.saved_maps enable row level security;

-- Map tiles policies
drop policy if exists "map tiles owner access" on public.map_tiles;
create policy "map tiles owner access" on public.map_tiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "map tiles public read" on public.map_tiles;
create policy "map tiles public read" on public.map_tiles for select using (is_published = true);

-- Map objects policies
drop policy if exists "map objects owner access" on public.map_objects;
create policy "map objects owner access" on public.map_objects for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "map objects public read" on public.map_objects;
create policy "map objects public read" on public.map_objects for select using (is_published = true);

-- Saved maps policies
drop policy if exists "saved maps owner access" on public.saved_maps;
create policy "saved maps owner access" on public.saved_maps for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "saved maps public read" on public.saved_maps;
create policy "saved maps public read" on public.saved_maps for select using (true);

grant select, insert, update, delete on public.map_tiles to authenticated;
grant select on public.map_tiles to anon;
grant select, insert, update, delete on public.map_objects to authenticated;
grant select on public.map_objects to anon;
grant select, insert, update, delete on public.saved_maps to authenticated;
grant select, insert, update, delete on public.saved_maps to anon;
