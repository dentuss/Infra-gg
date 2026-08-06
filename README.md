# Infragg — Rainbow Six Siege Team Platform

Private, invite-only workspace for a competitive Rainbow Six Siege team.
One app instead of Discord scheduling, Google Slides strategy boards,
Google Docs, shared folders, and manual VOD notes.

See [PRODUCT.md](PRODUCT.md) for the product vision, [TASKS.md](TASKS.md)
for the roadmap, [CONTRIBUTING.md](CONTRIBUTING.md) for the branch and
release workflow, and [CLAUDE.md](CLAUDE.md) for engineering rules.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + TypeScript
- [TailwindCSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com) — Postgres, Auth, Realtime, Storage
- [React Query](https://tanstack.com/query) (server state) + [Zustand](https://zustand.docs.pmnd.rs) (client state)
- [React Konva](https://konvajs.org/docs/react/) (strategy board), [Tiptap](https://tiptap.dev) (documents), [FullCalendar](https://fullcalendar.io) (calendar)
- Operator icons by [r6operators](https://github.com/marcopixel/r6operators) (MIT, not affiliated with Ubisoft)
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

| Script                 | What it does                  |
| ---------------------- | ----------------------------- |
| `npm run dev`          | Dev server (Turbopack)        |
| `npm run build`        | Production build              |
| `npm run start`        | Serve the production build    |
| `npm run typecheck`    | TypeScript, no emit           |
| `npm run lint`         | ESLint                        |
| `npm run lint:fix`     | ESLint with autofix           |
| `npm run format`       | Prettier write                |
| `npm run format:check` | Prettier check (CI uses this) |
| `npm test`             | Vitest, single run (CI)       |
| `npm run test:watch`   | Vitest in watch mode          |

A Husky pre-commit hook runs lint-staged (ESLint + Prettier on staged
files).

## Project structure

```
src/
  app/          # App Router routes and layouts (globals.css lives here)
  components/   # UI components by feature (components/ui = shadcn/ui)
  hooks/        # Custom React hooks
  i18n/         # next-intl config and locale helpers
  lib/          # Shared utilities and clients (supabase, strategy, pptx, dissect)
  services/     # Data access — every Supabase read/write goes through here
  store/        # Zustand client-state stores
  types/        # Shared types, including generated database types
messages/       # next-intl message catalogues (en.json, ru.json)
supabase/
  migrations/   # SQL migration history (see supabase/README.md)
```

Business logic belongs in services, hooks, and server actions — not in
components. Unit tests sit next to what they cover in `__tests__/`
directories and run under Vitest.

## Environments

| Environment | Branch   | URL                                       | Database      |
| ----------- | -------- | ----------------------------------------- | ------------- |
| Production  | `master` | `infra-gg.vercel.app`                     | `infragg`     |
| Staging     | `dev`    | `infra-gg-git-dev-team-ventus.vercel.app` | `infragg-dev` |
| Preview     | any PR   | per-PR Vercel URL                         | `infragg-dev` |

Staging and PR previews run against a **separate Supabase project**, so
testing can never write to real team data. Every non-production build
shows an amber badge next to the team name in the sidebar.

Work flows `feat/*` → `dev` → `master`; nothing else merges into
`master`. Full rules in [CONTRIBUTING.md](CONTRIBUTING.md).

## CI / CD

Every push and pull request runs GitHub Actions
([ci.yml](.github/workflows/ci.yml)): install → typecheck → lint →
format check → unit tests → build, with npm and Next.js build caching.
A second workflow ([pr-guard.yml](.github/workflows/pr-guard.yml))
validates the branch model and PR title — it stands in for branch
protection, which needs a paid GitHub plan on private repositories.

Deployment is handled by the **Vercel Git integration**: pushes to
`master` deploy production, pushes to `dev` update staging, and every
pull request gets its own preview URL. Since both long-lived branches
only move through CI-green pull requests, deploys are gated on CI.

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
