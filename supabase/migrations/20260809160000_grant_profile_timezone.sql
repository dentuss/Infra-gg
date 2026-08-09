-- `authenticated` holds a deliberately narrow, column-level UPDATE grant on
-- profiles so a member cannot write their own `role` or `is_member`. Adding
-- profiles.timezone did not extend that grant, so every attempt to save a
-- personal time zone was rejected before RLS was even consulted — and the
-- picker showed nothing, because the error was never surfaced.
--
-- Any future column a member is meant to edit needs the same line.
grant update (timezone) on public.profiles to authenticated;
