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
- `src/lib/api.ts` — thin `fetch` wrapper for `apps/api`. Reads the API base URL from `NEXT_PUBLIC_API_URL` (see `.env.example`), defaulting to `http://localhost:3000` for local dev. `ApiError` carries the HTTP status and a message normalized from Nest's error body (`message` can be a string or a `string[]` from `class-validator`). Exposes `getMeetings` (`GET /meetings`) and `getMeeting` (`GET /meetings/:id`, scoped to the caller's own meetings — see `apps/api` `MeetingsController`), plus the meeting-files calls below. Add further calls here rather than scattering raw `fetch` in components.
  - `listMeetingFiles` (`GET /meetings/:id/files`), `deleteMeetingFile` (`DELETE /meetings/:id/files/:fileId`) — plain `fetch`, same `ApiError` handling as the rest of the file.
  - `uploadMeetingFile` (`POST /meetings/:id/files`) — uses `XMLHttpRequest` instead of `fetch` (deliberately, not for consistency with the rest of the file) because only `XMLHttpRequest.upload.onprogress` exposes upload progress; `fetch` has no equivalent event for outgoing request bodies. Takes an optional `onProgress(percent)` callback. Error parsing is duplicated as `parseErrorBody` (string-based, since XHR exposes `responseText` rather than a `Response` to hand to the shared `parseError`).
  - `downloadMeetingFile` (`GET /meetings/:id/files/:fileId`) — fetches the file as a `Blob` and triggers a client-side save via a temporary `<a download>` element, rather than a plain `<a href>` link, because the endpoint requires the `Authorization` bearer header (a bare link can't attach one).
- `src/lib/auth.ts` — `localStorage`-backed session helpers (`saveSession`, `getToken`, `getEmail`, `clearSession`). There is no auth context/provider — this is the minimal wiring, not a full session layer. Pages that need the session read it directly via these helpers rather than duplicating `localStorage` calls.
- `src/app/register/page.tsx` and `src/app/login/page.tsx` — client components (`'use client'`) that call `POST /auth/register` / `POST /auth/login` (see `apps/api` `AuthModule`), save the session via `saveSession`, and redirect to `/`.
- `src/app/page.tsx` + `src/app/home-view.tsx` — the protected home route. `home-view.tsx` is a client component that reads the session on mount; if there's no token it redirects to `/login` (no server-side/middleware auth check — this is a client-only guard). It fetches the current user's meetings via `getMeetings`, clearing the session and redirecting to `/login` on a 401. Renders a "Recent meetings" section (the 3 most recent by date) above an "All meetings" section, with loading/empty/error states. Each meeting card is a `next/link` to `/meetings/[id]`.
- `src/app/meetings/[id]/page.tsx` + `meeting-view.tsx` — the meeting detail route, same client-component pattern as `home-view.tsx` (`useParams()` for the dynamic segment rather than the async `params` prop, since the page needs `'use client'` for interactivity throughout). Loads the meeting (`getMeeting`) and its files (`listMeetingFiles`) in parallel on mount; a 401 clears the session and redirects to `/login` same as the home route. Because `getMeeting` is scoped to the caller's own meetings, only the meeting's owner can ever reach this page successfully today — the "delete" action is therefore shown unconditionally to anyone who can load the page at all, rather than doing a separate owner check client-side (there's no participant-facing entry point into this page yet, so this isn't exercised in practice for non-owners).
  - Renders a "Meeting files" card: an upload trigger styled as a dashed dropzone (still a single native `<input type="file">` + `Button`, no drag-and-drop was added — click-to-upload only), `accept` scoped to the API's allowed mime types, a `ProgressBar` driven by `uploadMeetingFile`'s progress callback, a per-file row (mime-type icon, name, size/date/uploader metadata, icon-only Download/Delete `Button`s with `aria-label`s), and `Alert`s (`role="alert"`) for load/upload/action errors. Delete asks for `window.confirm` first since it's irreversible.
  - `page.tsx` loads `Inter` via `next/font/google` (`latin` + `cyrillic` subsets, since meeting titles/dates render in Russian) and applies it only to this route's `<main>` via `className`/CSS variable — scoped on purpose, the rest of the app still uses the default system font stack from `globals.css`.
  - Deliberately light-mode only, matching every other page: an earlier attempt at `dark:` overrides here revealed that HeroUI v3's own component styles (`Card`, `Button`, `Alert`, etc.) don't respond to `prefers-color-scheme` on their own, so mixing in ad-hoc `dark:` utility classes produces washed-out, low-contrast text rather than a working dark theme. Supporting dark mode for real would need a proper HeroUI theme toggle (not just Tailwind's `dark:` variant) applied app-wide, not per page.

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
