-- Bench players attached to an event: the substitute or trial standing in for
-- someone. Held as an array rather than a join table because the client writes
-- events as a single row and has no transaction to keep two tables in step —
-- the trade is no foreign key, so the UI ignores ids that no longer resolve to
-- a member (mirrors how events.excluded_dates already works).
alter table public.events
  add column substitute_ids uuid[] not null default '{}';

comment on column public.events.substitute_ids is
  'Profile ids of substitutes/trials attending. Not FK-enforced: array columns cannot reference another table.';
