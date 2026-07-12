-- Team roles per PRODUCT.md
create type public.team_role as enum ('coach', 'igl', 'analyst', 'player', 'manager');

-- One profile per authenticated user; created automatically on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  avatar_url text,
  role public.team_role not null default 'player',
  is_member boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Single-use invite codes gating team membership.
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  code uuid not null unique default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;

-- Helpers run as definer so RLS policies can consult profiles without recursion.
create function public.is_team_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = uid and is_member
  );
$$;

create function public.can_manage_invites(uid uuid)
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
      and role in ('coach', 'manager')
  );
$$;

create policy "Members can view all profiles" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_team_member((select auth.uid())));

create policy "Users can update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Users may only change their own username and avatar; role and
-- membership are managed by the system.
revoke update on table public.profiles from authenticated;
grant update (username, avatar_url) on table public.profiles to authenticated;

create policy "Invite managers can view invites" on public.invites
  for select to authenticated
  using (public.can_manage_invites((select auth.uid())));

create policy "Invite managers can create invites" on public.invites
  for insert to authenticated
  with check (
    public.can_manage_invites((select auth.uid()))
    and created_by = (select auth.uid())
  );

create policy "Invite managers can delete unused invites" on public.invites
  for delete to authenticated
  using (public.can_manage_invites((select auth.uid())) and used_by is null);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile whenever a user signs up. The very first user
-- bootstraps the workspace as a member with the coach role; everyone
-- else joins by redeeming an invite.
create function public.handle_new_user()
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
    case when bootstrap then 'coach' else 'player' end::public.team_role,
    bootstrap
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomically redeem an invite for the signed-in user.
create function public.redeem_invite(invite_code uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  invite_id uuid;
begin
  if uid is null then
    return false;
  end if;

  if exists (select 1 from public.profiles where id = uid and is_member) then
    return true;
  end if;

  select id into invite_id
  from public.invites
  where code = invite_code
    and used_by is null
    and expires_at > now()
  for update;

  if invite_id is null then
    return false;
  end if;

  update public.invites
  set used_by = uid, used_at = now()
  where id = invite_id;

  update public.profiles
  set is_member = true
  where id = uid;

  return true;
end;
$$;

revoke execute on function public.redeem_invite(uuid) from anon, public;
grant execute on function public.redeem_invite(uuid) to authenticated;
