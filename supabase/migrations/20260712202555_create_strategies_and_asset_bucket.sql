-- Strategy board: strategies stored as JSON scenes.
create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  map text not null check (char_length(map) between 1 and 40),
  data jsonb not null default '{"pages":[]}'::jsonb,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.strategies enable row level security;

create trigger strategies_set_updated_at
  before update on public.strategies
  for each row execute function public.set_updated_at();

-- Authors are staff plus players; substitutes and trials are read-only.
create function private.can_author(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and is_member
      and role in ('coach', 'manager', 'igl', 'player')
  );
$$;

revoke execute on function private.can_author(uuid) from anon, public;
grant execute on function private.can_author(uuid) to authenticated;

create policy "Members can view strategies" on public.strategies
  for select to authenticated
  using (private.is_team_member((select auth.uid())));

create policy "Authors can create strategies" on public.strategies
  for insert to authenticated
  with check (
    private.can_author((select auth.uid()))
    and created_by = (select auth.uid())
  );

create policy "Creators and staff can update strategies" on public.strategies
  for update to authenticated
  using (
    (created_by = (select auth.uid()) and private.can_author((select auth.uid())))
    or private.is_staff((select auth.uid()))
  );

create policy "Creators and staff can delete strategies" on public.strategies
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    or private.is_staff((select auth.uid()))
  );

-- Public bucket for operator icons, gadgets, and map blueprints.
-- Uploads happen via the Supabase dashboard (folders: icons/, blueprints/).
insert into storage.buckets (id, name, public)
values ('strategy', 'strategy', true)
on conflict (id) do nothing;

create policy "Strategy assets are readable" on storage.objects
  for select using (bucket_id = 'strategy');
