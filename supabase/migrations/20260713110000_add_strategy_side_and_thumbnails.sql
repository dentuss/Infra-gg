-- Strategies are filed under map → attack/defense folders.
alter table public.strategies
  add column side text not null default 'attack'
    check (side in ('attack', 'defense'));

-- Thumbnails: small board snapshots the editor uploads to
-- strategy/thumbnails/<strategy id>.png on autosave. Write access mirrors
-- the strategies update policy (creator or staff), checked via the row
-- the file name points at.
create policy "Strategy owners can add thumbnails" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'strategy'
    and name like 'thumbnails/%'
    and exists (
      select 1 from public.strategies s
      where name = 'thumbnails/' || s.id || '.png'
        and (
          s.created_by = (select auth.uid())
          or private.is_staff((select auth.uid()))
        )
    )
  );

create policy "Strategy owners can replace thumbnails" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'strategy'
    and name like 'thumbnails/%'
    and exists (
      select 1 from public.strategies s
      where name = 'thumbnails/' || s.id || '.png'
        and (
          s.created_by = (select auth.uid())
          or private.is_staff((select auth.uid()))
        )
    )
  )
  with check (
    bucket_id = 'strategy'
    and name like 'thumbnails/%'
    and exists (
      select 1 from public.strategies s
      where name = 'thumbnails/' || s.id || '.png'
        and (
          s.created_by = (select auth.uid())
          or private.is_staff((select auth.uid()))
        )
    )
  );

create policy "Strategy owners can delete thumbnails" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'strategy'
    and name like 'thumbnails/%'
    and exists (
      select 1 from public.strategies s
      where name = 'thumbnails/' || s.id || '.png'
        and (
          s.created_by = (select auth.uid())
          or private.is_staff((select auth.uid()))
        )
    )
  );
