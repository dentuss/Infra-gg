# Contributing

How work moves from a branch to the live app.

## Branch model

```
                                    ┌──────────────────────────────┐
  feat/board-layers ────PR────►     │  dev        (staging)        │
  fix/import-arrows ────PR────►     │  auto-deploys to             │
  chore/ci-cache    ────PR────►     │  infra-gg-git-dev-…app       │
                                    └──────────────┬───────────────┘
                                                   │ PR (release)
                                                   ▼
                                    ┌──────────────────────────────┐
                                    │  master     (production)     │
                                    │  infra-gg.vercel.app         │
                                    └──────────────────────────────┘
```

**Nothing merges into `master` except `dev`** — or a `hotfix/*` branch when
production is broken and waiting for the normal path is not an option.

Day to day you only touch the top row: branch off `dev`, open a PR into `dev`,
merge when CI is green. Promoting to production is a separate, deliberate PR
from `dev` into `master`.

### Branch names

`<type>/<slug>`, lowercase and hyphenated. Type is one of:

`feat` `fix` `chore` `refactor` `docs` `test` `perf` `ci` `build` `style`

Large features may nest one level — `feat/board-layers/lock-toggle` merges into
`feat/board-layers`, which merges into `dev`. Use this only when a feature is
genuinely too big for one review; the extra tier costs a round trip.

`hotfix/<slug>` is the one branch type that may target `master` directly. After
a hotfix lands, merge `master` back down into `dev` so the two do not drift.

### Commit and PR messages

[Conventional Commits](https://www.conventionalcommits.org), enforced two ways:

- **commitlint** runs on the `commit-msg` hook, so a bad message fails locally.
- **PR guard** checks the pull request title, since a squash merge takes its
  message from the title, not from the commits.

```
feat(board): add layer list
fix(pptx): centre marker numbers in imported circles
chore!: drop Node 20 support        ← ! marks a breaking change
```

## Environments

| Environment | Branch     | URL                                       | Database      |
| ----------- | ---------- | ----------------------------------------- | ------------- |
| Production  | `master`   | `infra-gg.vercel.app`                     | `infragg`     |
| Staging     | `dev`      | `infra-gg-git-dev-team-ventus.vercel.app` | `infragg-dev` |
| Preview     | any PR     | per-PR Vercel URL                         | `infragg-dev` |
| Local       | — | `localhost:3000`                          | your choice   |

Staging and every PR preview point at a **separate Supabase project**, so no
amount of clicking around on staging can touch real team data. Every
non-production build shows an amber badge beside the team name in the sidebar.

`dev.infra-gg.vercel.app` is not possible — Vercel owns the `vercel.app` apex
and does not let you add subdomains of it. A real `dev.` subdomain needs a
domain you own; the URLs above are Vercel's stable generated branch URLs.

### One-time setup of the staging environment

Recorded here so the environment can be rebuilt from scratch. All of it
happens in dashboards; none of it is in code.

1. **Supabase** — create a second free project named `infragg-dev`. Apply every
   file in `supabase/migrations/` in filename order. Re-upload the storage
   assets that were added by hand on production: blueprints under
   `strategy/blueprints/<Map>/<Author>/`, gadget icons under `strategy/icons/`,
   and `dissect/dissect.wasm` in a public `tools` bucket.
2. **Vercel → Settings → Environment Variables** — scope these to **Preview**
   only, leaving the existing Production values alone:
   - `NEXT_PUBLIC_SUPABASE_URL` → the `infragg-dev` URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → the `infragg-dev` key
   - `NEXT_PUBLIC_APP_ENV` → `preview`

   Then add `NEXT_PUBLIC_APP_ENV` → `production` scoped to **Production**.
3. **Vercel → Settings → Git** — confirm the production branch is `master`.
   Every other branch, `dev` included, deploys as a preview automatically.
4. **Supabase → `infragg-dev` → Authentication → URL Configuration** — set the
   Site URL to the staging URL and add both
   `https://infra-gg-git-dev-team-ventus.vercel.app/auth/callback` and
   `http://localhost:3000/auth/callback` to Redirect URLs.
5. Free Supabase projects pause after about a week of inactivity. If staging
   returns connection errors, open the dashboard and resume it.

### Migrations

Migrations run against `infragg-dev` first, and only reach production when the
`dev` → `master` PR merges. That ordering is the whole point of the split: a
migration that breaks something breaks staging, on your own time.

1. Write the migration in `supabase/migrations/`.
2. Apply it to `infragg-dev` and check the feature against it.
3. Open the PR into `dev`.
4. When promoting `dev` → `master`, apply the same migration to `infragg`
   **before** merging, so production code never runs against an old schema.

Never edit a database by hand — see [supabase/README.md](supabase/README.md).

## Checks

Run before pushing; CI runs all of them again on every PR.

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

The PR guard additionally validates the branch model and PR title. If you ever
need to bypass it — a repo-wide rename, an emergency — add the `override-flow`
label to the pull request.

## A note on enforcement

GitHub branch protection requires a paid plan on private repositories, so
`master` is not physically write-protected. The guard workflow fails any pull
request that breaks the rules above, but nothing stops a direct
`git push origin master`. Treat that as off-limits: it skips CI, skips review,
and deploys straight to the team.
