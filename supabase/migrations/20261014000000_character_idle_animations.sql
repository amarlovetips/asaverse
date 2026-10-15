create table if not exists public.character_idle_animations (
  id uuid primary key default gen_random_uuid(),
  character_design_id uuid not null references public.character_designs(id) on delete cascade,
  frame_number smallint not null check (frame_number between 1 and 3),
  frame_data jsonb not null default '{}'::jsonb check (jsonb_typeof(frame_data) = 'object'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint character_idle_animations_design_frame_unique unique (character_design_id, frame_number)
);

alter table public.character_idle_animations enable row level security;

drop policy if exists "Admins can manage character idle frames" on public.character_idle_animations;
create policy "Admins can manage character idle frames"
  on public.character_idle_animations
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users as admin
      where admin.user_id = auth.uid()
        and admin.role = 'admin'
        and admin.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users as admin
      where admin.user_id = auth.uid()
        and admin.role = 'admin'
        and admin.is_active = true
    )
  );
