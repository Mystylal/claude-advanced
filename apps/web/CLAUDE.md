# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Part of the `course-claude` npm workspaces monorepo (see root `CLAUDE.md`). This app is the workspace `web`.

## Commands

Run from this directory (or from the repo root with a `:web` suffix, e.g. `npm run dev:web`):

```bash
npm run dev            # next dev (Turbopack)
npm run build           # next build
npm run start           # next start (serve production build)
npm run lint            # eslint
npm run lint:fix        # eslint --fix
npm run format          # prettier --write .
npm run format:check    # prettier --check .
```

There are no tests configured yet.

## Architecture

- App Router under `src/app`; entry files are `layout.tsx` and `page.tsx`. Currently the unmodified `create-next-app` scaffold.
- Import alias `@/*` resolves to `src/*` (`tsconfig.json`).
- `eslint.config.mjs` composes `eslint-config-next` (`core-web-vitals` + `typescript`) with `eslint-config-prettier` appended last to turn off stylistic rules that would conflict with Prettier formatting.
- Prettier config (`.prettierrc`): `singleQuote: true`, `trailingComma: "all"` — matches `apps/api`'s Prettier settings for consistency across the monorepo.

## Keeping documentation current

If a change alters this app's architecture (new routing/data-layer pattern, new major dependency, structural reorganization under `src/`), update this file (and the root `CLAUDE.md` if it affects the monorepo-level picture) in the same change.
