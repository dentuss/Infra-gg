# Contributing

How work gets from your machine to the team.

- [The short version](#the-short-version)
- [The three branches](#the-three-branches)
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

### Two gotchas that have already bitten

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
fact.

---

## Setting up staging

Staging is **not live yet**. Until it is, PR previews and the `dev` deployment
still read and write the **production** database — so don't treat them as a
sandbox.

### The blocker worth knowing about first

The `strategy` bucket holds **662 objects, ~755 MB** — the blueprint renders,
mostly. Supabase's free tier gives **1 GB per project**. So "copy the assets to
staging" would consume three quarters of the free quota and mean re-uploading
662 files by hand, since they were added through the dashboard originally.

Three ways out, in the order I'd consider them:

1. **Share the read-only assets with production** (needs a small code change,
   not yet written). Blueprints, gadget icons and `dissect.wasm` are public,
   read-only, and byte-identical in every environment — there is no reason for
   staging to hold its own copy. An `NEXT_PUBLIC_ASSET_SUPABASE_URL` pointing at
   production would let staging read them while writing its data to
   `infragg-dev`. Per-environment content (`thumbnails/`, `imports/`, avatars)
   would still live in the staging project.
2. **Upload one map's blueprints only.** Staging works for that map; the rest
   show broken images. Fine if you only ever test one map.
3. **Skip storage entirely.** The database side of staging works; the board
   shows no blueprints. Fine for testing the calendar, useless for the board.

Nothing below depends on which you choose — do the database first.

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

**"Staging returns connection errors."** The free project has paused. Open its
dashboard.

**"The amber badge says LOCAL but I'm on staging."** `NEXT_PUBLIC_APP_ENV` isn't
set for the Preview environment in Vercel.

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

**Why is `master` not write-protected?** Branch protection needs a paid GitHub
plan on a private repository. It's £-per-month cheap if you ever want it; until
then the rule is convention, and a direct push to `master` skips CI, skips
review and deploys straight to the team.

**Why a separate Supabase project rather than Supabase's branching?** Branching
is a Pro feature. Two free projects cost nothing and give the same isolation,
at the price of applying migrations twice.
