# Supabase

Two projects:

| Project       | Ref                    | Used by                    |
| ------------- | ---------------------- | -------------------------- |
| `infragg`     | `mlpvwaxedcjqvjxtzfss` | production (`master`)      |
| `infragg-dev` | `eaztuqbeblfneznsnvpq` | staging (`dev`) and all PR previews |

## Migrations

All schema changes go through migrations — never edit a database by hand.

- Every migration lives in `supabase/migrations/` as
  `<timestamp>_<description>.sql`.
- Apply to **`infragg-dev` first**, then to `infragg` before the `dev` →
  `master` release merges, so production code never runs against an old schema.
- Every table must enable Row Level Security in the same migration that
  creates it. Note that `infragg-dev` has Supabase's newer `rls_auto_enable`
  event trigger and production does not, so a migration that forgets it
  **passes on staging and leaves production exposed**.

### Only the MCP applies migrations

Use the Supabase MCP `apply_migration` tool. Do **not** use `supabase db push`,
and do **not** connect the Supabase GitHub integration.

`apply_migration` stamps the migration ledger with **its own timestamp**, not
the one in the filename:

| Migration                          | Filename         | Ledger           |
| ---------------------------------- | ---------------- | ---------------- |
| `add_strategy_side_and_thumbnails` | `20260713110000` | `20260713151600` |
| `split_assigned_ingame_role`       | `20260718120000` | `20260718110128` |
| `availability`                     | `20260807120000` | `20260807112331` |

Anything that reconciles repo filenames against the ledger therefore concludes
that **every migration is unapplied** and tries to run all of them again.

This is not hypothetical. On 2026-08-10 the Supabase GitHub integration was
connected to the **production** project; it enabled branching on `master`,
attempted to replay all twenty migrations against live data, and reported
`MIGRATIONS_FAILED`. Nothing was damaged only because the migrations are not
idempotent — the first statement hit `type "team_role" already exists` and the
whole run aborted. An abort on statement one is luck, not a safety property.

The integration has been disconnected. It also could not have done anything
useful: Supabase Branching is a paid feature, which is why its `Supabase
Preview` check reported `skipped` rather than passing.

If the ledger ever needs to agree with the filenames — before adopting the CLI,
say — realign the versions in `supabase_migrations.schema_migrations` first.
That is a metadata-only change; do it deliberately, not as a side effect.

### Storage buckets

Created and policed by migrations: `avatars`, `strategy` (blueprints, icons,
thumbnails, and `imports/<strategy id>/` for uploaded `.pptx` media) and
`tools`, which serves the Match Replay WebAssembly decoder.

`strategy` holds ~662 objects and ~755 MB, which does not fit twice in the free
tier, so staging does not copy it — blueprints, icons and the decoder are read
from production via `NEXT_PUBLIC_ASSET_SUPABASE_URL`. See CONTRIBUTING.md.

## Auth providers (OAuth)

Discord and Google sign-in are wired in the app (`signInWithProvider` in
`src/services/auth.ts`); they go live once the providers are enabled in the
Supabase dashboard. No code or schema change is needed to turn them on — the
`handle_new_user` trigger already fills username/avatar from provider metadata.

Provider callback URL (identical for both):

```
https://mlpvwaxedcjqvjxtzfss.supabase.co/auth/v1/callback
```

- **Discord** — Discord Developer Portal → New Application → OAuth2. Add the
  callback URL above as a redirect, copy the Client ID + Client Secret, then
  Supabase → Authentication → Providers → Discord → enable and paste. Scopes
  `identify email` are enough.
- **Google** — Google Cloud Console → APIs & Services → Credentials → OAuth
  client ID (Web application). Configure the consent screen, add the callback
  URL above as an authorized redirect URI, copy the Client ID + Secret, then
  Supabase → Providers → Google → enable and paste.
- **Redirect allow-list** — Supabase → Authentication → URL Configuration, and
  remember there are **two projects** to configure:
  - `infragg`: Site URL `https://infra-gg.vercel.app`, redirect
    `https://infra-gg.vercel.app/auth/callback`
  - `infragg-dev`: Site URL
    `https://infra-gg-git-dev-team-ventus.vercel.app`, redirect
    `https://infra-gg-git-dev-team-ventus.vercel.app/auth/callback`
  - both: `http://localhost:3000/auth/callback` for local dev
  Providers are enabled per project too, so Discord and Google have to be
  configured on `infragg-dev` separately before OAuth works on staging.
- **Ubisoft** — there is no public "Sign in with Ubisoft" OAuth provider, so it
  is shown as a disabled placeholder. Associate a player's R6 identity through
  the manual account link on the profile page (future work) instead.

