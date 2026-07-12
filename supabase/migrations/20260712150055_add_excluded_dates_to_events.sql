-- Per-occurrence deletions for weekly recurring events: dates listed
-- here are skipped when the series is expanded.
alter table public.events
  add column excluded_dates date[] not null default '{}';
