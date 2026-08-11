# Contributing

How work gets from your machine to the team.

- [The short version](#the-short-version)
- [The three branches](#the-three-branches)
- [Branch protection](#branch-protection)
- [Worked examples](#worked-examples)
- [Naming things](#naming-things)
- [Checks](#checks)
- [Environments](#environments)
- [Migrations](#migrations)
- [Setting up staging](#setting-up-staging)
- [When something goes wrong](#when-something-goes-wrong)
- [Why it is shaped this way](#why-it-is-shaped-this-way)

---

## The short version

Nine times out of ten, this is the whole workflow:

```bash
git checkout dev && git pull          # start from the latest dev
git checkout -b fix/snap-guides       # <type>/<slug>

# ...do the work...

npm run typecheck && npm run lint && npm test && npm run build
git commit -m "fix(board): stop snap guides stranding"
git push -u origin fix/snap-guides
```

Then open a pull request **into `dev`**, wait for CI, merge.

When you want the team to have it, open a second pull request from `dev` into
`master`. That deploys production.

That's it. Everything below is detail for the cases that aren't that.

---

## The three branches

| Branch          | What it is                        | Who merges into it            |
| --------------- | --------------------------------- | ----------------------------- |
| `master`        | What the team uses. Production.   | Only `dev`, or a `hotfix/*`   |
| `dev`           | Everything finished but unshipped | Your `<type>/<slug>` branches |
| `<type>/<slug>` | One change you're working on      | —                             |

**`master`** is sacred. Every push to it deploys to the team immediately. It
only ever moves by merging `dev` into it.

**`dev`** is the waiting room. Work lands here as it's finished, and sits until
you decide to do a release. This lets you finish three things on Monday and ship
them together on Friday, instead of three separate production deploys.

**Your branch** is short-lived — hours or days. Branch it off `dev`, merge it
back into `dev`, delete it.

### When a feature is too big for one branch

Sometimes one feature is genuinely several pull requests' worth of work — the
strategy board's layer system, say. Rather than one enormous unreviewable PR,
give the feature its own branch and hang the parts off it:

```
feat/board/layers      ─PR─►  feat/board  ─PR─►  dev  ─PR─►  master
feat/board/lock-toggle ─PR─►  feat/board
feat/board/hide-toggle ─PR─►  feat/board
```

Two rules keep this from becoming a mess:

1. **Name it after the thing, not the type.** `feat/board`, not `feature`. The
   branch exists because *the board* is big.
2. **Delete it when it merges.** It is not a permanent home for board work; it
   is a staging area for one specific effort.

Most work never needs this. Reach for it only when the alternative is a pull
request nobody can review in one sitting.

---

### Branch protection

`master` and `dev` are protected by rulesets, so the model above is enforced
rather than merely agreed:

|                                            | `master`       | `dev`    |
| ------------------------------------------ | -------------- | -------- |
| Pull request required                       | yes            | no       |
| Required approvals                          | 0 — see below  | —        |
| Status check `Typecheck, lint, and build`   | required       | required |
| Branch must be up to date before merging    | yes            | —        |
| Force pushes                                | blocked        | blocked  |
| Deletion                                    | blocked        | blocked  |

**Required approvals is deliberately `0`.** GitHub will not let you approve your
own pull request, so any higher number deadlocks a one-person team. Zero still
gives the protection that matters: nothing reaches `master` except through a
pull request with green CI. Raise it the day someone else can review.

A repository admin sits on `master`'s bypass list as an escape hatch. That is a
break-glass affordance, not a workflow — using it skips CI and review and
deploys straight to the team.

## Worked examples

### A small fix

```bash
git checkout dev && git pull
git checkout -b fix/marker-alignment
# ...fix it...
git commit -m "fix(availability): align slots with the hour labels"
git push -u origin fix/marker-alignment
```

PR into `dev`. Merge. Done.

### A big feature, in parts

```bash
# Create the epic branch once, off dev.
git checkout dev && git pull
git checkout -b feat/board && git push -u origin feat/board

# Each part branches off the epic, not off dev.
git checkout -b feat/board/layers
# ...work...
git push -u origin feat/board/layers
```

PR `feat/board/layers` → **`feat/board`**. Repeat for each part. When the whole
feature is done, PR `feat/board` → `dev` and delete `feat/board`.

If `dev` moves while you're working, pull it into the epic branch so the parts
stay current:

```bash
git checkout feat/board && git pull origin dev && git push
```

### Production is broken right now

```bash
git checkout master && git pull
git checkout -b hotfix/login-crash
# ...fix it...
git push -u origin hotfix/login-crash
```

PR straight into `master`. This is the one exception to "only `dev` merges into
`master`". **Afterwards, merge `master` back down into `dev`**, or `dev` is
missing the fix and will undo it at the next release:

```bash
git checkout dev && git pull && git merge master && git push
```

### Shipping a release

```bash
git checkout dev && git pull
```

Open a PR from `dev` into `master`. Title it like a release, e.g.
`feat: availability, substitutes and time zones`. Merge it. Vercel deploys
production.

**Bump `version` in `package.json` in that PR.** Pushing to `master` with a
version that has no tag yet makes the Release workflow tag it and write release
notes from the merged pull requests — which is why PR titles have to be
Conventional Commits. Promoting without bumping is a no-op, not an error, so a
hotfix that does not deserve a release simply does not get one.

Semver, loosely: `feat` in the release means a minor bump, only fixes means a
patch, and `!` anywhere means major. The running version is shown at the bottom
of the sidebar with its commit, so "what are you on?" has an answer.

**If the release includes a migration, apply it to the production database
before merging** — see [Migrations](#migrations).

---

## Naming things

### Branches

`<type>/<slug>` — lowercase, hyphenated:

`feat` `fix` `chore` `refactor` `docs` `test` `perf` `ci` `build` `style`

```
feat/calendar-recurrence
fix/board-snap-guides
chore/bump-next
feat/board/layers          ← part of the feat/board epic
hotfix/login-crash         ← the only type that may target master
```

### Commits and PR titles

[Conventional Commits](https://www.conventionalcommits.org):

```
feat(board): add layer list
fix(pptx): centre marker numbers in imported circles
chore!: drop Node 20 support        ← ! marks a breaking change
```

**The PR title matters as much as the commits.** A squash merge takes its
message from the title, so a PR called "fixes" produces a commit called "fixes"
forever.

---

## Checks

Run these before pushing. CI runs all of them again on every pull request, so
running them locally just saves you a round trip.

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run format:check  # prettier --check
npm test              # vitest run
npm run build         # next build
```

`npm run format` fixes formatting; `npm run lint:fix` fixes what ESLint can.

A Husky pre-commit hook already runs ESLint and Prettier on staged files, so
formatting rarely fails in CI.

---

## Environments

| Environment    | Branch   | URL                                       | Database      |
| -------------- | -------- | ----------------------------------------- | ------------- |
| **Production** | `master` | `infra-gg.vercel.app`                     | `infragg`     |
| **Staging**    | `dev`    | `infra-gg-git-dev-team-ventus.vercel.app` | `infragg-dev` |
| **Preview**    | any PR   | its own URL, posted on the PR             | `infragg-dev` |
| **Local**      | —        | `localhost:3000`                          | your choice   |

Every non-production build shows an **amber badge** beside the team name in the
sidebar — `LOCAL` or `STAGING`. Production shows nothing. Since staging and
production are both `*.vercel.app` running the same UI, that badge is the only
thing telling you which database you're about to write to.

> **`dev.infra-gg.vercel.app` is not possible.** Vercel owns the `vercel.app`
> apex and won't let you add subdomains of it. The staging URL above is
> Vercel's own generated branch URL and it always serves the latest `dev`. A
> real `dev.` subdomain would need a domain you own.

---

## Migrations

Every schema change is a file in `supabase/migrations/`, named
`<timestamp>_<description>.sql`. Never edit a database by hand — see
[supabase/README.md](supabase/README.md).

The order matters:

1. Write the migration.
2. **Apply it to `infragg-dev`** and check the feature against it.
3. Open the PR into `dev`.
4. When you promote `dev` → `master`, **apply the same migration to `infragg`
   before merging**, so production code never runs against an old schema.

That ordering is the whole reason staging exists: a migration that breaks
something breaks staging, on your own time, instead of breaking the team.

### Three gotchas that have already bitten

**`public.profiles` uses column-level UPDATE grants.** A member may only write
`avatar_url`, `full_name`, `ingame_role`, `username`, `timezone`. That's
deliberate — it's what stops someone writing their own `role` or `is_member`.
If you add a column a member is meant to edit, the same migration needs:

```sql
grant update (<column>) on public.profiles to authenticated;
```

Without it the write fails on a column privilege **before RLS even runs**, and
if the caller doesn't surface errors it looks like nothing happened. This cost a
full round trip on `profiles.timezone`.

**Enable RLS in the same migration that creates a table**, and add the policies
there too. `get_advisors` will flag a table without them, but only after the
fact — and `infragg-dev` has an `rls_auto_enable` trigger that production lacks,
so forgetting passes on staging and leaves production exposed.

**Only the MCP applies migrations.** Not `supabase db push`, and not the
Supabase GitHub integration. `apply_migration` stamps the ledger with its own
timestamp rather than the filename's, so anything reconciling the two decides
every migration is unapplied and replays all of them. That happened on
2026-08-10 against *production*, and only failed harmlessly because the first
statement hit "already exists" and aborted the run. See
[supabase/README.md](supabase/README.md).

---

## Setting up staging

Staging is **not live yet**. Until it is, PR previews and the `dev` deployment
still read and write the **production** database — so don't treat them as a
sandbox.

### How staging gets its blueprints

Staging does **not** hold its own copy. The `strategy` bucket is **662 objects,
~755 MB** — mostly blueprint renders — and a free Supabase project gets **1 GB**
in total, so copying it would eat three quarters of the quota and mean
re-uploading 662 files by hand.

Instead, staging reads the shared assets straight from production. Blueprints,
gadget icons and `dissect.wasm` are public, read-only and byte-identical in
every environment, so there is nothing to gain from duplicating them. Setting

```
NEXT_PUBLIC_ASSET_SUPABASE_URL=<production URL>
NEXT_PUBLIC_ASSET_SUPABASE_PUBLISHABLE_KEY=<production publishable key>
```

points those reads at production while everything else — the database,
thumbnails, `.pptx` import media, avatars — stays in `infragg-dev`.

Leave both unset and assets come from the same project as the data, which is
what production and a local setup want. They must be set **together**: a URL
without its key would authenticate against the wrong project, so a half-set pair
is ignored.

The client used for these reads never carries a session, so it cannot act as the
signed-in user against a project that is not this environment's. It does not
need one: the `strategy` bucket's SELECT policy is granted to `public` and
`tools` is a public bucket.

### 1. Create the project

Supabase dashboard → **New project** → name it `infragg-dev`, same region as
production. Free tier.

### 2. Apply the migrations

In order, from `supabase/migrations/`. There are 19 as of writing, from
`20260711214332_create_profiles_and_invites.sql` to
`20260809160000_grant_profile_timezone.sql`.

Easiest path: open each file, paste into the SQL editor, run. Filename order is
the correct order — they're timestamped.

Say the word and I can apply them for you through the Supabase MCP, the same way
production's were applied.

### 3. Point Vercel's Preview environment at it

Vercel → your project → **Settings → Environment Variables**. Add these scoped
to **Preview only** — leave the existing Production values alone:

| Variable                               | Value                    |
| -------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | the `infragg-dev` URL    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `infragg-dev` key    |
| `NEXT_PUBLIC_APP_ENV`                  | `preview`                |
| `NEXT_PUBLIC_ASSET_SUPABASE_URL`             | the **production** URL |
| `NEXT_PUBLIC_ASSET_SUPABASE_PUBLISHABLE_KEY` | the **production** key |

Then add one scoped to **Production**:

| Variable              | Value        |
| --------------------- | ------------ |
| `NEXT_PUBLIC_APP_ENV` | `production` |

Both keys are under **Project Settings → API Keys** in Supabase. Use the
**publishable** key — never the secret/service-role one.

### 4. Confirm the production branch

Vercel → **Settings → Git** → production branch should be `master`. Every other
branch, `dev` included, deploys as a preview automatically.

### 5. Let people sign in to staging

`infragg-dev` → **Authentication → URL Configuration**:

- **Site URL**: `https://infra-gg-git-dev-team-ventus.vercel.app`
- **Redirect URLs**: add both
  - `https://infra-gg-git-dev-team-ventus.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

Without this, signing in to staging bounces you somewhere wrong.

### 6. Know that it sleeps

Free Supabase projects pause after about a week of inactivity. If staging starts
returning connection errors, open its dashboard and resume it. Production is
unaffected.

---

## When something goes wrong

**"My PR targets the wrong branch."** Change the base on the PR page — GitHub
lets you edit it without reopening.

**"I branched off `master` instead of `dev`."** If you haven't pushed:

```bash
git rebase --onto dev master your-branch
```

If you have, it's usually easier to branch fresh off `dev` and cherry-pick your
commits over.

**"`dev` and `master` have drifted."** Usually a hotfix that never came back
down. Merge `master` into `dev` and push.

**"CI passes locally but fails on GitHub."** Almost always `format:check` —
Prettier formats files the pre-commit hook didn't see, like Markdown or YAML.
Run `npm run format` and commit the result.

**"Staging shows production data."** Step 3 above isn't done yet. That's
expected until it is.

**"Staging has no blueprints."** The two `NEXT_PUBLIC_ASSET_SUPABASE_*`
variables are unset or only half set, so asset reads fall back to
`infragg-dev`, which holds no blueprints. Both must be present.

**"Sign-in on staging 404s."** A Supabase URL with a path. Both
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_ASSET_SUPABASE_URL` must be the
**bare project URL** — `https://<ref>.supabase.co` — because the client appends
its own `/auth/v1/…`, `/rest/v1/…` and `/storage/v1/…`. Paste the REST endpoint
by mistake and you get `/rest/v1/auth/v1/token`, which answers 404 with no clue
why. The build now refuses such a value outright, so a build failure naming
`NEXT_PUBLIC_SUPABASE_URL` means exactly this.

**"Staging returns connection errors."** The free project has paused. Open its
dashboard.

**"The amber badge says LOCAL but I'm on staging."** `NEXT_PUBLIC_APP_ENV` isn't
set for the Preview environment in Vercel.

**"GitHub refuses my push to `master` or `dev`."** Working as intended — see
[Branch protection](#branch-protection). Open a pull request instead.

**"My own pull request will not merge, it wants an approval."** Required
approvals is above zero. GitHub does not let you approve your own pull request,
so on a one-person team that is a deadlock: set it back to `0`, or add yourself
to the ruleset's bypass list.

---

## Why it is shaped this way

Recorded so it doesn't get relitigated.

**Why `dev` at all, when it's one developer?** It decouples "finished" from
"shipped". You can merge work whenever it's ready and choose when the team sees
it, and it gives migrations a place to be proven before they touch real data.

**Why not long-lived `feature` / `fix` / `chore` branches?** They group by *kind
of change* rather than *unit of work*. Unrelated efforts get coupled — if the
calendar is ready but the board is half-done, you can't ship the calendar. And
most real work spans types anyway: the availability feature was feat commits, a
fix, a chore and a refactor, which would have split it across four parents. They
also never die, so they drift from `dev` and need constant back-merging. The
type is already stated by the branch name and the commit prefix.

**Why is the branch model enforced by GitHub now?** It used to be convention
only — protection needs a paid plan on a *private* repository. The repo is
public and the account is an organization on Team, so rulesets are available and
active. Protection on a public repository is free on every plan; Team is what
buys org-level rulesets, required reviewers and bypass lists.

**Why a separate Supabase project rather than Supabase's branching?** Branching
is a Pro feature. Two free projects cost nothing and give the same isolation,
at the price of applying migrations twice.
