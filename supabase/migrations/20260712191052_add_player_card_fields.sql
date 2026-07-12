-- Real name and in-game role for the big roster cards.
alter table public.profiles
  add column full_name text
    check (full_name is null or char_length(full_name) <= 60),
  add column ingame_role text
    check (ingame_role is null or char_length(ingame_role) <= 30);

-- Users may edit these on their own row (existing own-row policy);
-- staff may edit them on any member's row.
grant update (full_name, ingame_role) on table public.profiles to authenticated;

create policy "Staff can update member profiles" on public.profiles
  for update to authenticated
  using (private.is_staff((select auth.uid())))
  with check (private.is_staff((select auth.uid())));
