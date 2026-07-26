# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This is an npm workspaces monorepo with two independent apps, each a standalone npm workspace:

- `apps/web` — Next.js 16 (App Router, TypeScript, Turbopack) frontend. See `apps/web/CLAUDE.md`.
- `apps/api` — NestJS 11 (TypeScript) backend. See `apps/api/CLAUDE.md`.

There is no shared `packages/` code and no Turborepo/Nx — orchestration is plain `npm --workspace` scripts defined in the root `package.json`. Both apps currently contain only their default framework scaffolds (no custom features yet).

## Commands

Run from the repo root (`npm install` installs dependencies for both workspaces into a single root `node_modules`):

```bash
npm install              # install all workspace dependencies

npm run dev:web          # next dev (apps/web)
npm run dev:api          # nest start --watch (apps/api)

npm run build            # build both apps
npm run build:web
npm run build:api

npm run lint             # lint both apps
npm run lint:web
npm run lint:api

npm run format           # prettier --write both apps
npm run format:web
npm run format:api

npm run test:api         # jest unit tests for apps/api (apps/web has no tests yet)
```

To run a single test, a single lint target, or any other per-app script not exposed at the root, `cd` into the app and use its own `package.json` scripts directly (see `apps/web/CLAUDE.md` / `apps/api/CLAUDE.md`).

## Conventions

- Package manager is npm (workspaces), not pnpm/yarn — deliberate choice, do not add a second lockfile or switch tooling without discussion.
- Each app owns its own ESLint + Prettier config rather than a shared root config; keep it that way when editing lint rules.

## Keeping documentation current

Whenever a change alters the project's architecture — new workspace/package, new shared code, changed build/orchestration setup, a new framework or major dependency, changed module boundaries — update this file and the affected `apps/*/CLAUDE.md` in the same change. Do not let CLAUDE.md drift into describing a structure that no longer exists.
