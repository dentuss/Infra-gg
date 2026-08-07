-- Availability: each player marks the hours they can play, so staff can see
-- where the roster overlaps instead of asking on Discord every week.

create type public.availability_status as enum (
  'available',
  'maybe',
  'unavailable'
);

-- Hours are numbered against the calendar's own day window, which runs
-- 10:00 -> 03:00. Hour 24 is midnight, 25 is 01:00, 26 is 02:00 of the
-- following morning. Numbering them against the day they are *displayed*
-- under keeps this table and the schedule in agreement about which night a
-- late scrim belongs to. The 0..47 bound leaves room to widen the window.
create table public.availability (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  hour smallint not null check (hour between 0 and 47),
  status public.availability_status not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, day, hour)
);

create index availability_day_idx on public.availability (day);

alter table public.availability enable row level security;

-- The whole point is seeing the team's overlap, so every member reads
-- everyone's rows; writes are restricted to your own.
create policy "Members can view availability" on public.availability
  for select to authenticated
  using (private.is_team_member((select auth.uid())));

create policy "Players set their own availability" on public.availability
  for insert to authenticated
  with check (
    private.is_team_member((select auth.uid()))
    and user_id = (select auth.uid())
  );

create policy "Players change their own availability" on public.availability
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Players clear their own availability" on public.availability
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- The typical week. Any hour without an explicit row above falls back to the
-- player's default for that weekday, so a regular schedule is entered once
-- rather than re-entered every Monday.
create table public.availability_defaults (
  user_id uuid not null references public.profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Monday
  hour smallint not null check (hour between 0 and 47),
  status public.availability_status not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, weekday, hour)
);

alter table public.availability_defaults enable row level security;

create policy "Members can view availability defaults"
  on public.availability_defaults
  for select to authenticated
  using (private.is_team_member((select auth.uid())));

create policy "Players set their own availability defaults"
  on public.availability_defaults
  for insert to authenticated
  with check (
    private.is_team_member((select auth.uid()))
    and user_id = (select auth.uid())
  );

create policy "Players change their own availability defaults"
  on public.availability_defaults
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Players clear their own availability defaults"
  on public.availability_defaults
  for delete to authenticated
  using (user_id = (select auth.uid()));
