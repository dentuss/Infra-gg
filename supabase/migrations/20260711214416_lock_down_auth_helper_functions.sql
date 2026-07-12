-- RLS helpers do not belong in the API-exposed public schema.
create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.is_team_member(uuid) set schema private;
alter function public.can_manage_invites(uuid) set schema private;

revoke execute on function private.is_team_member(uuid) from anon, public;
revoke execute on function private.can_manage_invites(uuid) from anon, public;
grant execute on function private.is_team_member(uuid) to authenticated;
grant execute on function private.can_manage_invites(uuid) to authenticated;

-- Trigger functions never need to be callable through the API; triggers
-- do not perform an EXECUTE privilege check at fire time.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
