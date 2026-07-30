# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This is an npm workspaces monorepo with two independent apps, each a standalone npm workspace:

- `apps/web` — Next.js 16 (App Router, TypeScript, Turbopack) frontend. See `apps/web/CLAUDE.md`.
- `apps/api` — NestJS 11 (TypeScript) backend. See `apps/api/CLAUDE.md`.

There is no shared `packages/` code and no Turborepo/Nx — orchestration is plain `npm --workspace` scripts defined in the root `package.json`. `apps/web` is still the unmodified `create-next-app` route/page scaffold but now has Tailwind CSS v4 + HeroUI wired up for styling (see `apps/web/CLAUDE.md`); `apps/api` has a first feature (auth) — see `apps/api/CLAUDE.md`.

A root `docker-compose.yml` runs a local Postgres 16 instance used by `apps/api` (Prisma). Start it with `docker compose up -d` before running the API or its tests. It publishes the container's port 5432 on host port **5433**, not 5432 — a native Postgres install on the host machine already owns 5432/localhost, so the compose file was changed to avoid that collision. Point `DATABASE_URL` at port 5433 accordingly.

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
npm run test:e2e:api     # jest e2e tests for apps/api (test/*.e2e-spec.ts) — needs `docker compose up -d` first, see below
```

To run a single test, a single lint target, or any other per-app script not exposed at the root, `cd` into the app and use its own `package.json` scripts directly (see `apps/web/CLAUDE.md` / `apps/api/CLAUDE.md`).

## Conventions

- Package manager is npm (workspaces), not pnpm/yarn — deliberate choice, do not add a second lockfile or switch tooling without discussion.
- Each app owns its own ESLint + Prettier config rather than a shared root config; keep it that way when editing lint rules.
- Husky is installed at the root (`.husky/pre-commit`) and runs `npm run lint` and `npm run test:api` on every commit. It does not run `test:e2e:api` since that needs `docker compose up -d` first.

## Keeping documentation current

Whenever a change alters the project's architecture — new workspace/package, new shared code, changed build/orchestration setup, a new framework or major dependency, changed module boundaries — update this file and the affected `apps/*/CLAUDE.md` in the same change. Do not let CLAUDE.md drift into describing a structure that no longer exists.
