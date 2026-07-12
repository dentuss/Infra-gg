-- Calendar events: practices, scrims, matches, meetings, reminders.
create type public.event_type as enum ('practice', 'scrim', 'match', 'meeting', 'reminder');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text,
  type public.event_type not null default 'practice',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  -- Simple weekly recurrence: repeats every week at the same time,
  -- optionally until recur_until (inclusive).
  recurs_weekly boolean not null default false,
  recur_until date,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_order check (ends_at >= starts_at)
);

alter table public.events enable row level security;

create index events_starts_at_idx on public.events (starts_at);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- Coach/manager check, reusable across features. can_manage_invites
-- becomes a thin wrapper so the role list lives in one place.
create function private.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = uid
      and is_member
      and role in ('coach', 'manager')
  );
$$;

revoke execute on function private.is_staff(uuid) from anon, public;
grant execute on function private.is_staff(uuid) to authenticated;

create or replace function private.can_manage_invites(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_staff(uid);
$$;

create policy "Members can view events" on public.events
  for select to authenticated
  using (private.is_team_member((select auth.uid())));

create policy "Members can create events" on public.events
  for insert to authenticated
  with check (
    private.is_team_member((select auth.uid()))
    and created_by = (select auth.uid())
  );

create policy "Creators and staff can update events" on public.events
  for update to authenticated
  using (
    created_by = (select auth.uid())
    or private.is_staff((select auth.uid()))
  )
  with check (created_by is not null);

create policy "Creators and staff can delete events" on public.events
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    or private.is_staff((select auth.uid()))
  );
