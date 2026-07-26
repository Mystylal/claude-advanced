# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Part of the `course-claude` npm workspaces monorepo (see root `CLAUDE.md`). This app is the workspace `api`.

## Commands

Run from this directory (or from the repo root with a `:api` suffix, e.g. `npm run build:api`):

```bash
npm run start           # nest start
npm run start:dev       # nest start --watch
npm run start:debug     # nest start --debug --watch
npm run start:prod      # node dist/main (after build)
npm run build           # nest build
npm run lint            # eslint --fix over src, apps, libs, test
npm run format          # prettier --write over src and test

npm test                # jest unit tests (*.spec.ts, rootDir: src)
npm run test:watch
npm run test:cov
npm run test:debug
npm run test:e2e        # jest -c test/jest-e2e.json (*.e2e-spec.ts)
```

To run a single unit test: `npx jest app.controller` (Jest `rootDir` is `src`, matches `*.spec.ts`). For a single e2e test: `npx jest --config ./test/jest-e2e.json app.e2e-spec`.

## Architecture

- Standard Nest module structure: `src/main.ts` bootstraps via `NestFactory.create(AppModule)` and listens on `process.env.PORT ?? 3000`.
- `src/app.module.ts` is the root module wiring `AppController` + `AppService`. Currently the unmodified `@nestjs/cli` scaffold — add new features as their own modules rather than growing `AppModule`.
- `nest-cli.json` sets `sourceRoot: src` and `deleteOutDir: true` (build output goes to `dist/`, cleaned on each build).
- `eslint.config.mjs` is a flat config using `typescript-eslint` `recommendedTypeChecked` plus `eslint-plugin-prettier/recommended`, so `npm run lint` (`--fix`) also applies Prettier formatting — `npm run format` is only needed for a formatting-only pass. `@typescript-eslint/no-explicit-any` is disabled; `no-floating-promises` / `no-unsafe-argument` are downgraded to warnings.
- TypeScript strict mode is enabled (`tsconfig.json`).

## Keeping documentation current

If a change alters this app's architecture (new modules, new module boundaries, new major dependency, changed bootstrap/config setup), update this file (and the root `CLAUDE.md` if it affects the monorepo-level picture) in the same change.
