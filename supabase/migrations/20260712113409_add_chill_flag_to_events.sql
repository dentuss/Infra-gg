-- Chill events mark their whole day as a rest day in the calendar.
alter table public.events add column is_chill boolean not null default false;
