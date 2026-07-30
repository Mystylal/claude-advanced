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

- App Router under `src/app`; entry files are `layout.tsx` and `page.tsx`. `src/app/register` is the first real route — the rest is still the unmodified `create-next-app` scaffold.
- Import alias `@/*` resolves to `src/*` (`tsconfig.json`).
- `eslint.config.mjs` composes `eslint-config-next` (`core-web-vitals` + `typescript`) with `eslint-config-prettier` appended last to turn off stylistic rules that would conflict with Prettier formatting.
- Prettier config (`.prettierrc`): `singleQuote: true`, `trailingComma: "all"` — matches `apps/api`'s Prettier settings for consistency across the monorepo.
- `src/lib/api.ts` — thin `fetch` wrapper for `apps/api`. Reads the API base URL from `NEXT_PUBLIC_API_URL` (see `.env.example`), defaulting to `http://localhost:3000` for local dev. `ApiError` carries the HTTP status and a message normalized from Nest's error body (`message` can be a string or a `string[]` from `class-validator`). Also exposes `getMeetings` (`GET /meetings`, bearer-authenticated). Add further calls here rather than scattering raw `fetch` in components.
- `src/lib/auth.ts` — `localStorage`-backed session helpers (`saveSession`, `getToken`, `getEmail`, `clearSession`). There is no auth context/provider — this is the minimal wiring, not a full session layer. Pages that need the session read it directly via these helpers rather than duplicating `localStorage` calls.
- `src/app/register/page.tsx` and `src/app/login/page.tsx` — client components (`'use client'`) that call `POST /auth/register` / `POST /auth/login` (see `apps/api` `AuthModule`), save the session via `saveSession`, and redirect to `/`.
- `src/app/page.tsx` + `src/app/home-view.tsx` — the protected home route. `home-view.tsx` is a client component that reads the session on mount; if there's no token it redirects to `/login` (no server-side/middleware auth check — this is a client-only guard). It fetches the current user's meetings via `getMeetings`, clearing the session and redirecting to `/login` on a 401. Renders a "Recent meetings" section (the 3 most recent by date) above an "All meetings" section, with loading/empty/error states.

## UI

- Tailwind CSS v4 is configured via `postcss.config.mjs` (`@tailwindcss/postcss` plugin, no `tailwind.config.js` needed — v4 is CSS-first).
- [HeroUI](https://heroui.com) v3 (`@heroui/react`) is the component library. It requires Tailwind v4 (peer dependency) and needs no `<Provider>` wrapper.
- `src/app/globals.css` imports HeroUI's styles first (`@import '@heroui/react/styles';`), which in turn imports Tailwind itself — do not add a separate `@import 'tailwindcss';`.
- Import components directly, e.g. `import { Button } from '@heroui/react';`.

## UI change verification

Any change that affects UI (markup, styling, layout, new/edited components or pages) is not done until both of the following happen in the same change:

1. **Visual test via Playwright MCP.** Use the Playwright MCP tools (navigate, snapshot/screenshot) against the running dev server to actually view the changed page/component rendered, and confirm it looks and behaves correctly — don't rely on type-checking, linting, or reading the code as a substitute for looking at it. The dev server is assumed to already be running (the user keeps it up) — do not start it yourself; just navigate to it.
2. **`ui-ux-pro-max` skill review.** Run the change through the `ui-ux-pro-max` skill (design-system/domain checks relevant to what changed — accessibility, spacing, color, forms, etc.) and address what it flags.

Only after both checks pass should the task be considered complete.

## Keeping documentation current

If a change alters this app's architecture (new routing/data-layer pattern, new major dependency, structural reorganization under `src/`), update this file (and the root `CLAUDE.md` if it affects the monorepo-level picture) in the same change.
