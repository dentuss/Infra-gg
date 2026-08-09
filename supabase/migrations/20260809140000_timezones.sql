-- Times are shown in a zone of the viewer's choosing, defaulting to the team's.
--
-- Availability hours stay anchored to the TEAM zone: a stored hour always means
-- the same real moment, and a viewer in another zone sees the same slots under
-- different labels. Storing them per viewer would make two players who both
-- marked "20:00" look like they overlap when they do not.
alter table public.team_settings
  add column timezone text not null default 'Europe/Berlin'
  check (char_length(timezone) between 1 and 64);

-- null means "follow the team default", so changing the team zone moves
-- everyone who has not deliberately opted out.
alter table public.profiles
  add column timezone text
  check (timezone is null or char_length(timezone) between 1 and 64);

comment on column public.team_settings.timezone is
  'IANA zone the team schedules in. Availability hours are anchored to this.';
comment on column public.profiles.timezone is
  'IANA zone this member views times in. Null follows team_settings.timezone.';
