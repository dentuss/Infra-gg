# Supabase

Project ref: `mlpvwaxedcjqvjxtzfss`

## Migrations

All schema changes go through migrations — never edit the production
database by hand.

- Every migration lives in `supabase/migrations/` as
  `<timestamp>_<description>.sql`, mirroring the migration history applied
  to the remote project.
- Migrations are applied to the remote project via the Supabase MCP
  `apply_migration` tool (or `supabase db push` when using the CLI). The
  SQL file committed here must be identical to what was applied.
- Every table must enable Row Level Security in the same migration that
  creates it.

The first schema migration lands in Phase 1 (authentication).
