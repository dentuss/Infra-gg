-- Staff-assigned in-game role, kept separate from the player's own `ingame_role`
-- so editing a member in Team management never overwrites what the player chose
-- in their own account settings. Staff-only: there is no direct update grant on
-- this column; it is written through the SECURITY DEFINER RPC below.
alter table public.profiles
  add column assigned_role text
    check (assigned_role is null or char_length(assigned_role) <= 30);

create function public.set_member_ingame_role(member_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff((select auth.uid())) then
    raise exception 'Only staff can set a member''s in-game role';
  end if;
  if new_role is not null and char_length(new_role) > 30 then
    raise exception 'In-game role is too long';
  end if;
  update public.profiles
    set assigned_role = new_role
    where id = member_id and is_member;
end;
$$;

revoke execute on function public.set_member_ingame_role(uuid, text) from anon, public;
grant execute on function public.set_member_ingame_role(uuid, text) to authenticated;
