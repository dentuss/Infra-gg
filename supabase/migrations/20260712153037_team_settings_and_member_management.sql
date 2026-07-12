-- Single-row team settings (workspace name).
create table public.team_settings (
  id boolean primary key default true,
  name text not null default 'Infragg' check (char_length(name) between 1 and 40),
  updated_at timestamptz not null default now(),
  constraint team_settings_singleton check (id)
);

alter table public.team_settings enable row level security;

create trigger team_settings_set_updated_at
  before update on public.team_settings
  for each row execute function public.set_updated_at();

create policy "Members can view team settings" on public.team_settings
  for select to authenticated
  using (private.is_team_member((select auth.uid())));

create policy "Staff can update team settings" on public.team_settings
  for update to authenticated
  using (private.is_staff((select auth.uid())))
  with check (private.is_staff((select auth.uid())));

insert into public.team_settings (id) values (true);

-- Role changes and member removal go through definer functions so the
-- role/is_member columns stay out of reach of direct updates.
create function public.set_member_role(member_id uuid, new_role public.team_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if not private.is_staff(caller) then
    raise exception 'Only coaches and managers can change roles.';
  end if;

  if new_role <> 'coach'
    and (select role from public.profiles where id = member_id) = 'coach'
    and (
      select count(*) from public.profiles
      where is_member and role = 'coach' and id <> member_id
    ) = 0
  then
    raise exception 'The team needs at least one coach.';
  end if;

  update public.profiles
  set role = new_role
  where id = member_id and is_member;
end;
$$;

create function public.remove_member(member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if not private.is_staff(caller) then
    raise exception 'Only coaches and managers can remove members.';
  end if;
  if member_id = caller then
    raise exception 'You cannot remove yourself.';
  end if;
  if (select role from public.profiles where id = member_id) = 'coach'
    and (
      select count(*) from public.profiles
      where is_member and role = 'coach' and id <> member_id
    ) = 0
  then
    raise exception 'The team needs at least one coach.';
  end if;

  update public.profiles set is_member = false where id = member_id;
end;
$$;

revoke execute on function public.set_member_role(uuid, public.team_role) from anon, public;
grant execute on function public.set_member_role(uuid, public.team_role) to authenticated;
revoke execute on function public.remove_member(uuid) from anon, public;
grant execute on function public.remove_member(uuid) to authenticated;
