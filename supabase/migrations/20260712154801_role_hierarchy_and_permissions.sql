-- New read-only roles.
alter type public.team_role add value 'substitute';
alter type public.team_role add value 'trial';

-- Staff (full control) is now coach, manager, or IGL.
create or replace function private.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = uid
      and is_member
      and role in ('coach', 'manager', 'igl')
  );
$$;

-- The schedule belongs to staff: players and below are read-only.
drop policy "Members can create events" on public.events;
drop policy "Creators and staff can update events" on public.events;
drop policy "Creators and staff can delete events" on public.events;

create policy "Staff can create events" on public.events
  for insert to authenticated
  with check (
    private.is_staff((select auth.uid()))
    and created_by = (select auth.uid())
  );

create policy "Staff can update events" on public.events
  for update to authenticated
  using (private.is_staff((select auth.uid())))
  with check (created_by is not null);

create policy "Staff can delete events" on public.events
  for delete to authenticated
  using (private.is_staff((select auth.uid())));

drop policy "Members can add chill days" on public.chill_days;
drop policy "Members can remove chill days" on public.chill_days;

create policy "Staff can add chill days" on public.chill_days
  for insert to authenticated
  with check (
    private.is_staff((select auth.uid()))
    and created_by = (select auth.uid())
  );

create policy "Staff can remove chill days" on public.chill_days
  for delete to authenticated
  using (private.is_staff((select auth.uid())));

-- Guards now protect the last staff member, not specifically the coach:
-- staff can move freely between coach/manager/igl even when alone.
create or replace function public.set_member_role(member_id uuid, new_role public.team_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if not private.is_staff(caller) then
    raise exception 'Only staff can change roles.';
  end if;

  if new_role not in ('coach', 'manager', 'igl')
    and (select role from public.profiles where id = member_id)
      in ('coach', 'manager', 'igl')
    and (
      select count(*) from public.profiles
      where is_member
        and role in ('coach', 'manager', 'igl')
        and id <> member_id
    ) = 0
  then
    raise exception 'The team needs at least one coach, manager, or IGL.';
  end if;

  update public.profiles
  set role = new_role
  where id = member_id and is_member;
end;
$$;

create or replace function public.remove_member(member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if not private.is_staff(caller) then
    raise exception 'Only staff can remove members.';
  end if;
  if member_id = caller then
    raise exception 'You cannot remove yourself.';
  end if;
  if (select role from public.profiles where id = member_id)
      in ('coach', 'manager', 'igl')
    and (
      select count(*) from public.profiles
      where is_member
        and role in ('coach', 'manager', 'igl')
        and id <> member_id
    ) = 0
  then
    raise exception 'The team needs at least one coach, manager, or IGL.';
  end if;

  update public.profiles set is_member = false where id = member_id;
end;
$$;

-- The workspace creator bootstraps as manager now.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  bootstrap boolean;
begin
  select not exists (select 1 from public.profiles where is_member)
    into bootstrap;

  insert into public.profiles (id, username, avatar_url, role, is_member)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'user_name',
      split_part(new.email, '@', 1),
      'player'
    ) || ' #' || left(new.id::text, 4),
    new.raw_user_meta_data ->> 'avatar_url',
    case when bootstrap then 'manager' else 'player' end::public.team_role,
    bootstrap
  );
  return new;
end;
$$;
