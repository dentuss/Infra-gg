-- Chill days become first-class: toggled per date from the calendar
-- header instead of piggybacking on an event flag.
create table public.chill_days (
  day date primary key,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.chill_days enable row level security;

create policy "Members can view chill days" on public.chill_days
  for select to authenticated
  using (private.is_team_member((select auth.uid())));

create policy "Members can add chill days" on public.chill_days
  for insert to authenticated
  with check (
    private.is_team_member((select auth.uid()))
    and created_by = (select auth.uid())
  );

create policy "Members can remove chill days" on public.chill_days
  for delete to authenticated
  using (private.is_team_member((select auth.uid())));

-- Carry over days marked chill under the old event-flag mechanism.
insert into public.chill_days (day, created_by)
select distinct (starts_at at time zone 'UTC')::date, created_by
from public.events
where is_chill
on conflict (day) do nothing;

alter table public.events drop column is_chill;
