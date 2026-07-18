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
- **Redirect allow-list** — Supabase → Authentication → URL Configuration: set
  Site URL to `https://infra-gg.vercel.app` and add to Redirect URLs
  `https://infra-gg.vercel.app/auth/callback` plus (for local dev)
  `http://localhost:3000/auth/callback`.
- **Ubisoft** — there is no public "Sign in with Ubisoft" OAuth provider, so it
  is shown as a disabled placeholder. Associate a player's R6 identity through
  the manual account link on the profile page (future work) instead.

