-- The `tools` bucket serves the Match Replay WebAssembly decoder
-- (dissect/dissect.wasm) to the browser. It was created by hand in the
-- dashboard on production, which is why a fresh project came up without one —
-- exactly the drift that migrations exist to prevent.
--
-- No storage policy: the bucket is public, so the storage API serves it over
-- the public URL without consulting RLS, and production has none either.
-- Nothing in the app writes to it — the binary is uploaded by hand when it is
-- rebuilt each season (see src/lib/dissect/README.md).
--
-- A no-op on production, where the bucket already exists.
insert into storage.buckets (id, name, public, file_size_limit)
values ('tools', 'tools', true, 20000000)
on conflict (id) do nothing;
