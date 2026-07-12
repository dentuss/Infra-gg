# TASKS.md

# Rainbow Six Siege Team Platform

This document defines the development roadmap.

Claude should always work from the highest priority incomplete task.

---

# Project Status

Current Phase:

🟡 Phase 5 — Documents (up next)

Overall Progress:

42% — Phases 0–4 complete (Discord auth and public registration
deferred by decision; player statistics and activity feed arrive with
Phases 9 and 10)

---

# Legend

🔴 Not Started

🟡 In Progress

🟢 Complete

⏸ Blocked

---

# PHASE 0 — Project Infrastructure

## Repository

- [x] Initialize Git repository
- [x] Configure .gitignore
- [x] Configure .editorconfig
- [x] Create README.md
- [x] Create LICENSE (MIT)

---

## Next.js

- [x] Create Next.js project
- [x] Enable App Router
- [x] Enable TypeScript
- [x] Configure Tailwind
- [x] Configure path aliases
- [x] Configure Turbopack (default bundler in Next.js 16)

---

## Dependencies

### Core

- [x] Install Supabase
- [x] Install React Query
- [x] Install Zustand
- [x] Install React Hook Form
- [x] Install Zod

### UI

- [x] Install Lucide
- [x] Install Framer Motion
- [x] Install shadcn/ui

### Editor

- [x] Install Tiptap

### Strategy Board

- [x] Install React Konva
- [x] Install Konva

### Calendar

- [x] Install FullCalendar

---

## Code Quality

- [x] Configure ESLint
- [x] Configure Prettier
- [x] Configure Husky
- [x] Configure lint-staged
- [x] Configure strict TypeScript
- [x] Configure import sorting

---

## Environment

- [x] Create .env.example
- [x] Configure .env.local
- [x] Configure environment validation

---

## Docker

- [x] Create Dockerfile
- [x] Create docker-compose.yml
- [x] Configure development container

---

## GitHub

- [x] Push repository
- [ ] Protect master branch ⏸ (requires GitHub Pro for private repositories)
- [x] Configure Issue Templates
- [x] Configure Pull Request Template

---

## GitHub Actions

### CI

- [x] Install dependencies
- [x] Type checking
- [x] Lint
- [x] Build
- [x] Cache dependencies

### CD

- [x] Configure Vercel deployment (Git integration)
- [x] Deploy on merge to master
- [x] Verify deployment status (production live at infra-gg.vercel.app)

---

## Supabase

- [x] Create project
- [x] Connect application
- [ ] Configure authentication ⏸ (set Site URL + redirect URLs to the production domain in the Supabase dashboard)
- [ ] Configure storage
- [ ] Enable Realtime
- [x] Configure RLS
- [x] Create initial migrations

---

# PHASE 1 — Authentication

Status

🟢 (Discord OAuth and public registration deferred by decision)

---

## Authentication

- [ ] Discord OAuth (deferred — dropped from scope for now)
- [x] Email login
- [x] Invite-only registration (public sign-up removed — accounts are created manually for now)
- [x] Session persistence
- [x] Route protection
- [x] Logout

---

## User Profile

- [x] Avatar (Discord/initials, shown in sidebar and roster)
- [x] Username
- [ ] Team
- [x] Role

---

# PHASE 2 — Dashboard

Status

🟢 (widgets show empty states until their source phases land)

---

- [x] Dashboard layout
- [x] Sidebar
- [x] Navigation
- [x] Quick actions (enabled as their modules arrive)
- [x] Upcoming practices (live from the calendar)
- [x] Upcoming matches (live from the calendar)
- [x] Notifications (data arrives with Phase 10)

---

# PHASE 3 — Calendar

Status

🟢

---

- [x] Month view
- [x] Week view
- [x] Day view
- [x] Theory events (renamed from practice)
- [x] Match events (scrims and officials)
- [x] Reminders
- [x] Recurring events (weekly, optional end date)
- [x] Drag and drop (single events; recurring series are edited via the dialog)
- [x] Event editing

---

# PHASE 4 — Team Management

Status

🟢 (statistics and activity deferred to Phases 9 and 10)

---

## Players

- [x] Player list
- [x] Roles (staff can change them; last-coach guard)
- [ ] Statistics (deferred to Phase 9 — no stats data exists yet)
- [ ] Activity (deferred to Phase 10 — needs the activity/notifications feed)

---

## Teams

- [x] Team settings (workspace name, shown in the sidebar)
- [x] Invite players (create, copy, revoke single-use codes)
- [x] Remove players (revokes membership; the account itself stays)

---

# PHASE 5 — Documents

Status

🔴

---

- [ ] Rich text editor
- [ ] Markdown support
- [ ] Tables
- [ ] Images
- [ ] Checklists
- [ ] Mentions
- [ ] Search
- [ ] Folder structure

---

# PHASE 6 — Strategy Board

Status

🔴

---

## Canvas

- [ ] Infinite canvas
- [ ] Zoom
- [ ] Pan
- [ ] Grid

---

## Operators

- [ ] Attackers
- [ ] Defenders
- [ ] Drag
- [ ] Rotate
- [ ] Duplicate

---

## Drawing

- [ ] Arrow
- [ ] Line
- [ ] Circle
- [ ] Rectangle
- [ ] Text
- [ ] Icons

---

## Layers

- [ ] Layer list
- [ ] Lock
- [ ] Hide
- [ ] Reorder

---

## Editing

- [ ] Undo
- [ ] Redo
- [ ] Copy
- [ ] Paste
- [ ] Delete
- [ ] Multi-select

---

## Saving

- [ ] Autosave
- [ ] Manual save
- [ ] JSON export
- [ ] PNG export
- [ ] PDF export

---

## Version History

- [ ] Save versions
- [ ] Restore versions
- [ ] Compare versions

---

# PHASE 7 — Realtime Collaboration

Status

🔴

---

- [ ] Live cursors
- [ ] Live editing
- [ ] Presence
- [ ] Conflict resolution

---

# PHASE 8 — VOD Review

Status

🔴

---

- [ ] Upload screenshots
- [ ] Timeline
- [ ] Comments
- [ ] Drawing tools
- [ ] Assign mistakes

---

# PHASE 9 — Statistics

Status

🔴

---

- [ ] Match history
- [ ] Win rate
- [ ] Operator picks
- [ ] Site statistics
- [ ] Map statistics
- [ ] Performance charts

---

# PHASE 10 — Notifications

Status

🔴

---

- [ ] Discord webhook
- [ ] Email
- [ ] In-app notifications

---

# PHASE 11 — Polish

Status

🔴

---

## UI

- [ ] Animations
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Error pages

---

## Performance

- [ ] Image optimization
- [ ] Bundle optimization
- [ ] Lazy loading

---

## Accessibility

- [ ] Keyboard navigation
- [ ] Screen reader support

---

## Testing

- [ ] Unit tests
- [ ] Integration tests
- [ ] End-to-end tests

---

## Documentation

- [ ] Update README
- [ ] Deployment guide
- [ ] Environment guide
- [ ] Developer guide

---

# Future Features

These should NOT be started until every previous phase is complete.

- [ ] AI strategy suggestions
- [ ] AI VOD analysis
- [ ] Replay parser
- [ ] Match timeline
- [ ] Mobile support
- [ ] Progressive Web App
- [ ] Desktop application (Tauri)
- [ ] Offline mode
- [ ] Public strategy sharing
- [ ] Broad access — reopen self-registration with invites (accounts are created manually until then)
- [ ] Tournament management
- [ ] Scrim finder
- [ ] Analytics dashboard

---

# Rules for Claude

When completing tasks:

1. Complete one task at a time.
2. Do not skip phases.
3. Keep commits atomic.
4. Update this file after every completed task.
5. Mark completed tasks with `[x]`.
6. Never begin the next phase until the current one is complete unless explicitly instructed.
7. If a better architecture is identified, explain it before implementing it.
8. Keep documentation synchronized with implementation.
9. Ensure all CI checks pass before considering a task complete.
10. Never sacrifice maintainability for speed.

---

# Current Objective

🎯 Complete **Phase 0 — Project Infrastructure** before writing any application features.
