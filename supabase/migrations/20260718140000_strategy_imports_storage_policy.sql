-- Imported .pptx decks upload their media (operator icons, map backgrounds…) to
-- strategy/imports/<strategy id>/<file>. Write access mirrors the strategies
-- update policy (creator or staff), checked via the strategy id in the path.
create policy "Strategy owners can add import assets" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'strategy'
    and name like 'imports/%'
    and exists (
      select 1 from public.strategies s
      where name like 'imports/' || s.id || '/%'
        and (
          s.created_by = (select auth.uid())
          or private.is_staff((select auth.uid()))
        )
    )
  );

create policy "Strategy owners can replace import assets" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'strategy'
    and name like 'imports/%'
    and exists (
      select 1 from public.strategies s
      where name like 'imports/' || s.id || '/%'
        and (
          s.created_by = (select auth.uid())
          or private.is_staff((select auth.uid()))
        )
    )
  )
  with check (
    bucket_id = 'strategy'
    and name like 'imports/%'
    and exists (
      select 1 from public.strategies s
      where name like 'imports/' || s.id || '/%'
        and (
          s.created_by = (select auth.uid())
          or private.is_staff((select auth.uid()))
        )
    )
  );

create policy "Strategy owners can delete import assets" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'strategy'
    and name like 'imports/%'
    and exists (
      select 1 from public.strategies s
      where name like 'imports/' || s.id || '/%'
        and (
          s.created_by = (select auth.uid())
          or private.is_staff((select auth.uid()))
        )
    )
  );
