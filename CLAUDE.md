@AGENTS.md

# CLAUDE.md

# Rainbow Six Siege Team Platform

## Project Overview

This project is a private web application for a competitive Rainbow Six Siege team.

The application is intended to replace multiple tools such as:

- Discord scheduling
- Google Slides strategy boards
- Google Docs
- Shared folders
- Team calendars
- Manual VOD review notes

The platform should become the single source of truth for the team.

---

# Primary Goals

The project must always prioritize:

1. Security
2. Simplicity
3. Maintainability
4. Performance
5. Developer Experience
6. Scalability

Avoid overengineering.

Prefer simple and readable solutions over clever implementations.

---

# Development Order (IMPORTANT)

Claude MUST follow this order.

## Phase 0

Project setup.

Before implementing ANY application features, Claude MUST configure:

- Git repository
- Project structure
- Environment variables
- TypeScript configuration
- ESLint
- Prettier
- Husky
- lint-staged
- GitHub Actions
- CI pipeline
- Deployment pipeline
- Vercel configuration
- Supabase configuration
- README
- Docker support (development only)
- .editorconfig
- .gitignore

No application logic should be written before the project infrastructure is complete.

---

## Phase 1

Authentication

Implement:

- Supabase Auth
- Discord OAuth
- Session handling
- Route protection
- Invite-only registration

---

## Phase 2

Dashboard

---

## Phase 3

Calendar

---

## Phase 4

Players

---

## Phase 5

Documents

---

## Phase 6

Strategy Editor

---

## Phase 7

Realtime Collaboration

---

## Phase 8

Statistics

---

## Phase 9

VOD Review

---

# Technology Stack

Frontend

- Next.js (App Router)
- TypeScript
- TailwindCSS
- React Query
- Zustand

Backend

- Supabase

Database

- PostgreSQL

Realtime

- Supabase Realtime

Storage

- Supabase Storage

Canvas

- React Konva

Document Editor

- Tiptap

Calendar

- FullCalendar

Validation

- Zod

Forms

- React Hook Form

Icons

- Lucide

Deployment

- Vercel

Version Control

- GitHub

CI/CD

- GitHub Actions

---

# Code Style

Always write:

- TypeScript
- Strict typing
- Functional components
- Hooks
- Small files

Never use:

- any
- class components
- duplicated logic
- dead code
- unused imports

Prefer:

- composition
- reusable components
- custom hooks
- utility functions

---

# File Size

Maximum preferred sizes

Component

250 lines

Hook

150 lines

Utility

100 lines

If a file grows larger,
split it.

---

# Folder Structure

src/

    app/

    components/

    hooks/

    lib/

    services/

    store/

    types/

    utils/

    styles/

---

# Component Rules

Components should only contain UI logic.

Business logic belongs inside:

- services
- hooks
- server actions

Never mix everything together.

---

# State Management

Use

React Query

for server state.

Use

Zustand

for client state.

Never use global React Context unless necessary.

---

# Styling

TailwindCSS only.

Avoid inline styles.

Avoid CSS modules.

---

# Design Language

Theme

Dark

Inspired by

- Discord
- Notion
- R6 Tracker

Rounded corners

Soft shadows

Minimal animations

Professional appearance

No bright colors.

---

# Internationalization

The app is bilingual: English and Russian.

Every user-facing string MUST go through next-intl.

- Messages live in messages/en.json and messages/ru.json.
- Every new string must be added to BOTH files.
- The locale comes from the "locale" cookie (no URL prefixes).
- Use useTranslations in Client Components, getTranslations in Server
  Components and Server Actions.
- Format dates and times with formattingLocale() from src/i18n/config.ts.
- Use ICU plurals for counts (Russian has one/few/many forms).

Never hardcode UI text in components.

---

# Performance

Always optimize for:

Fast loading

Code splitting

Lazy loading

Memoization where useful

Server Components where appropriate

Avoid unnecessary re-renders.

---

# Security

Never expose

- Service Keys
- Secrets
- Tokens

Always validate

- user input
- permissions

Enable

Supabase Row Level Security

for every table.

Never trust the client.

---

# Database

All schema changes must be created using migrations.

Do not manually edit production databases.

---

# Environment Variables

Use

.env.local

for development.

Never commit secrets.

---

# Git

Use Conventional Commits.

Examples

feat:

fix:

refactor:

docs:

style:

test:

chore:

---

# GitHub

Use feature branches.

Never commit directly to master.

Example

feature/calendar

feature/strategy-board

feature/auth

---

# CI Pipeline

Every Pull Request must automatically run:

- npm install
- TypeScript compilation
- ESLint
- Production build

The PR should fail if any step fails.

---

# CD Pipeline

Deploy automatically to Vercel after merging into master.

Deployment should only happen if CI succeeds.

---

# Testing

When possible write:

- Unit tests
- Integration tests

Critical business logic should always be tested.

---

# Accessibility

Use semantic HTML.

Keyboard navigation.

ARIA labels where necessary.

Color contrast should meet WCAG recommendations.

---

# Error Handling

Never silently ignore errors.

Always

- log
- display meaningful messages
- recover gracefully

---

# Logging

Console logs should never remain in production.

---

# Documentation

Every feature should update:

README

and relevant documentation.

---

# Strategy Board

The strategy board is the most important feature.

It should support:

- drag operators
- resize
- rotate
- arrows
- circles
- smoke icons
- text
- layers
- undo
- redo
- zoom
- pan
- autosave
- export PNG
- export PDF
- version history

Strategies should be stored as JSON.

---

# Realtime

Use Supabase Realtime.

Never implement polling if realtime is available.

---

# API

Keep APIs RESTful.

Validate every request.

Return typed responses.

---

# Naming

Use descriptive names.

Avoid abbreviations.

Good

StrategyCanvas

Bad

SC

---

# Comments

Code should be self-explanatory.

Only comment:

WHY

not

WHAT

---

# Refactoring

Always improve existing code when appropriate.

Avoid technical debt.

---

# AI Guidelines

Claude should:

- prefer maintainability over shortcuts
- avoid unnecessary dependencies
- explain architectural decisions when making major changes
- ask for clarification only when requirements are ambiguous
- implement features incrementally
- keep commits focused and atomic
- never rewrite unrelated code without a clear reason

---

# Definition of Done

A feature is only considered complete when:

✓ TypeScript passes

✓ ESLint passes

✓ Production build succeeds

✓ Responsive

✓ Accessible

✓ Secure

✓ Documented

✓ No console errors

✓ No TypeScript warnings

✓ No unused code

✓ Ready for deployment

---

# Project Vision

The final product should feel like a combination of:

Discord +
Notion +
Google Slides +
R6 Tracker +
Miro

built specifically for competitive Rainbow Six Siege teams.

Every architectural decision should support this vision.
