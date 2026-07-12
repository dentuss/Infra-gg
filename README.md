# Infragg — Rainbow Six Siege Team Platform

Private, invite-only workspace for a competitive Rainbow Six Siege team.
One app instead of Discord scheduling, Google Slides strategy boards,
Google Docs, shared folders, and manual VOD notes.

See [PRODUCT.md](PRODUCT.md) for the product vision, [TASKS.md](TASKS.md)
for the roadmap, and [CLAUDE.md](CLAUDE.md) for engineering rules.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + TypeScript
- [TailwindCSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com) — Postgres, Auth, Realtime, Storage
- [React Query](https://tanstack.com/query) (server state) + [Zustand](https://zustand.docs.pmnd.rs) (client state)
- [React Konva](https://konvajs.org/docs/react/) (strategy board), [Tiptap](https://tiptap.dev) (documents), [FullCalendar](https://fullcalendar.io) (calendar)
- Deployed on [Vercel](https://vercel.com)

## Getting started

Requirements: Node.js ≥ 20.9 and npm.

```bash
git clone https://github.com/dentuss/Infra-gg.git
cd Infra-gg
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev
```

Open <http://localhost:3000>.

The Supabase URL and publishable key live in the Supabase dashboard under
Project Settings → API Keys. The publishable key is safe for the browser;
the secret (service role) key must never appear in the repo or in a
`NEXT_PUBLIC_` variable.

### Docker (development only)

```bash
docker compose up
```

Production runs on Vercel — the Docker setup exists purely for a
reproducible local dev environment.

## Scripts

| Script                 | What it does                          |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Dev server (Turbopack)                |
| `npm run build`        | Production build                      |
| `npm run start`        | Serve the production build            |
| `npm run typecheck`    | TypeScript, no emit                   |
| `npm run lint`         | ESLint                                |
| `npm run lint:fix`     | ESLint with autofix                   |
| `npm run format`       | Prettier write                        |
| `npm run format:check` | Prettier check (CI uses this)         |

A Husky pre-commit hook runs lint-staged (ESLint + Prettier on staged
files).

## Project structure

```
src/
  app/          # App Router routes and layouts
  components/   # Reusable UI components (components/ui = shadcn/ui)
  lib/          # Clients and shared utilities (supabase, env)
supabase/
  migrations/   # SQL migration history (see supabase/README.md)
```

Business logic belongs in services, hooks, and server actions — not in
components.

## CI / CD

Every push and pull request runs GitHub Actions
([ci.yml](.github/workflows/ci.yml)): install → typecheck → lint →
format check → build, with npm and Next.js build caching.

Deployment is handled by the **Vercel Git integration**: every push to
`master` deploys to production at
<https://infra-gg.vercel.app>. Since `master` only moves through
CI-green pull requests, deploys are effectively gated on CI.

## Internationalization

The app is bilingual (English/Russian) via
[next-intl](https://next-intl.dev). The locale is stored in a `locale`
cookie — no URL prefixes — and can be switched from the sidebar or the
login screen. Messages live in `messages/en.json` and
`messages/ru.json`; every user-facing string must exist in both.

## Conventions

- Conventional Commits (`feat:`, `fix:`, `chore:`, …)
- Feature branches only — never commit directly to `master`
- All schema changes via migrations in `supabase/migrations/`
- Row Level Security enabled on every table
- All UI text goes through next-intl (see Internationalization)
