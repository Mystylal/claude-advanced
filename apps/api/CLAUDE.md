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

npm test                # jest unit tests (*.spec.ts, rootDir: src) — none exist yet (passWithNoTests: true), add one alongside the first unit-testable module
npm run test:watch
npm run test:cov
npm run test:debug
npm run test:e2e        # jest -c test/jest-e2e.json (*.e2e-spec.ts)
```

To run a single unit test (once one exists): `npx jest <name>` (Jest `rootDir` is `src`, matches `*.spec.ts`). For a single e2e test: `npx jest --config ./test/jest-e2e.json auth.e2e-spec`.

### Database (Prisma + Postgres)

```bash
docker compose up -d           # from repo root: starts Postgres (see root CLAUDE.md re: port 5433)
npx prisma migrate dev         # apply/create migrations against the local DB
npx prisma generate            # regenerate the Prisma Client (also runs as part of migrate dev)
```

Requires `apps/api/.env` (gitignored; see `.env.example`) with `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`.

Prisma is v7, which changed how the CLI and client get their connection info compared to earlier versions:

- The connection URL is **not** in `prisma/schema.prisma` (a bare `url` in the `datasource` block is rejected). It lives in `prisma.config.ts` at the app root, loaded via `datasource: { url: env('DATABASE_URL') }`.
- `PrismaClient` requires an explicit driver adapter rather than reading `DATABASE_URL` itself — `src/prisma/prisma.service.ts` constructs one with `@prisma/adapter-pg`'s `PrismaPg`, using `ConfigService` for the connection string.

## Architecture

- Standard Nest module structure: `src/main.ts` bootstraps via `NestFactory.create(AppModule)`, enables CORS (`app.enableCors()`, permissive default — needed so `apps/web`'s browser-side `fetch` calls aren't blocked in dev), applies a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), and listens on `process.env.PORT ?? 3000`.
- `src/app.module.ts` wires `ConfigModule` (global), `PrismaModule`, `UsersModule`, `AuthModule`, `MeetingsModule`, `MeetingFilesModule`. There is no root controller/service (the `create-nest-app` scaffold `AppController`/`AppService` was removed once real feature modules existed) — add further features as their own modules rather than growing `AppModule`.
- `src/prisma/` — `PrismaModule` (global) + `PrismaService` (extends `PrismaClient`, connects/disconnects on module init/destroy). Inject `PrismaService` wherever DB access is needed.
- `src/users/` — CQRS (`@nestjs/cqrs`), owns the `User` Prisma model exclusively; no other module touches `prisma.user` directly. No controller — it's consumed only via `CommandBus`/`QueryBus`, not imported by other modules' TS code.
  - `commands/impl/create-user.command.ts` + `commands/handlers/create-user.handler.ts` — `CreateUserCommand` creates a user with a bcrypt-hashed password, 409 (`ConflictException`) on duplicate email, returns the full `UserRecord`.
  - `queries/impl/find-user-by-email.query.ts` + `queries/handlers/find-user-by-email.handler.ts` — `FindUserByEmailQuery` returns the `UserRecord` (including the hashed password) or `null`; it does not do any credential checking itself.
  - `interfaces/user-record.interface.ts` — shared `UserRecord` (`{ id, email, password, createdAt }`) return type for both handlers.
- `src/auth/` — CQRS (`@nestjs/cqrs`), not a plain service. `AuthModule` imports `CqrsModule` and `JwtModule` (secret/expiry from `ConfigService`, env vars `JWT_SECRET`/`JWT_EXPIRES_IN`); `AuthController` only depends on `CommandBus`/`QueryBus`, it holds no business logic. Auth owns token generation/verification and credential checking; it never touches Prisma or the `User` model directly — it talks to `src/users/` only through `CommandBus`/`QueryBus` (cross-module CQRS dispatch, not a direct module import), which is why `AuthModule` doesn't import `UsersModule`.
  - `commands/impl/register.command.ts` + `commands/handlers/register.handler.ts` — `RegisterCommand` dispatched by `POST /auth/register`; the `@CommandHandler` dispatches `CreateUserCommand` (via the injected `CommandBus`) to create the user, then signs and returns `{ accessToken }`.
  - `queries/impl/login.query.ts` + `queries/handlers/login.handler.ts` — `LoginQuery` dispatched by `POST /auth/login` (200); the `@QueryHandler` dispatches `FindUserByEmailQuery` (via the injected `QueryBus`), bcrypt-compares the password itself, 401 (`UnauthorizedException`) on any invalid credential, returns `{ accessToken }`. It never creates a user.
  - `interfaces/auth-result.interface.ts` — shared `AuthResult` (`{ accessToken: string }`) return type for both handlers.
  - New commands/queries follow the same `impl/` + `handlers/` split and get registered in the owning module's `providers` array; don't reintroduce a service layer for either module.
  - `AuthModule` exports `JwtModule` so other feature modules can reuse the same configured `JwtService` (see `MeetingsModule` below) instead of redeclaring `JWT_SECRET`/`JWT_EXPIRES_IN` wiring.
  - `guards/jwt-auth.guard.ts` — `JwtAuthGuard` (plain `CanActivate`, no Passport) reads the `Authorization: Bearer <token>` header, verifies it via `JwtService`, and attaches `{ userId, email }` to `request.user` (401 on missing/invalid token). `interfaces/authenticated-request.interface.ts` types that augmented request (`AuthenticatedRequest`/`AuthenticatedUser`).
- `src/meetings/` — CQRS, same shape as `src/auth/`. `MeetingsModule` imports `CqrsModule` and `AuthModule` (for the shared `JwtService`/`JwtAuthGuard`). `MeetingsController` is guarded by `JwtAuthGuard` at the class level and only depends on `CommandBus`/`QueryBus`; it reads the caller's id off `request.user.userId`.
  - `commands/impl/create-meeting.command.ts` + `commands/handlers/create-meeting.handler.ts` — dispatched by `POST /meetings` (`title`, `date`, `participants[]` via `CreateMeetingDto`), creates a `Meeting` owned by the current user.
  - `queries/impl/list-meetings.query.ts` + `queries/handlers/list-meetings.handler.ts` — dispatched by `GET /meetings`, returns only meetings owned by the current user.
  - `queries/impl/get-meeting.query.ts` + `queries/handlers/get-meeting.handler.ts` — dispatched by `GET /meetings/:id`, scoped to the current user's own meetings; 404 (`NotFoundException`) if the id doesn't exist or belongs to another user.
  - `interfaces/meeting-result.interface.ts` — shared `MeetingResult` return type for all three handlers.
  - Prisma `Meeting` model (`prisma/schema.prisma`): `id`, `title`, `date`, `participants String[]`, `ownerId` (FK to `User`), `createdAt`, `files` (back-relation to `MeetingFile`).
  - `queries/impl/get-meeting-by-id.query.ts` + `queries/handlers/get-meeting-by-id.handler.ts` — `GetMeetingByIdQuery` looks up a meeting by id regardless of owner (404 if missing); this is the query other modules (e.g. `MeetingFilesModule`) dispatch via `QueryBus` to fetch a meeting and do their own owner/participant access check, since `GetMeetingQuery` above is intentionally scoped to the caller's own meetings only.
- `src/meeting-files/` — CQRS, same shape as `src/meetings/`, a separate module (per the PRD) that never imports `MeetingsModule` directly — it fetches meetings via `QueryBus.execute(new GetMeetingByIdQuery(...))` and checks access itself. `MeetingFilesModule` imports `CqrsModule` and `AuthModule`. `MeetingFilesController` is guarded by `JwtAuthGuard` at the class level, routed at `meetings/:meetingId/files`.
  - `access/assert-meeting-access.ts` — shared `assertMeetingAccess(meeting, userId, email)` helper used by both the command and query handler below; throws `ForbiddenException` (403) unless the caller is the meeting's `ownerId` or their email is in `participants`. Combined with `GetMeetingByIdQuery`'s 404 on a nonexistent meeting, a non-participant gets 403 and a bogus id gets 404, per the PRD.
  - `commands/impl/upload-meeting-file.command.ts` + `commands/handlers/upload-meeting-file.handler.ts` — dispatched by `POST /meetings/:id/files`; the controller uses `@nestjs/platform-express`'s `FileInterceptor` with multer's `diskStorage` (streams directly to `apps/api/storage/meeting-files/` as the request body arrives, not buffered fully in memory) rather than the default memory storage engine. The handler only persists the `MeetingFile` row (name, mime type, size, disk path, uploader, status `pending`) after the access check passes; since multer already wrote the file to disk before the handler's access check runs, any thrown error (403/404) is caught and the just-written file is deleted (`fs/promises.unlink`, best-effort) before rethrowing, so rejected uploads don't leak orphaned files.
  - `config/file-upload.constants.ts` — `MAX_FILE_SIZE_BYTES` (20 MB, chosen to keep the e2e suite — which runs on every `git commit` via the Husky pre-commit hook — fast; revisit if real meeting recordings need a higher ceiling) and `isAllowedMimeType()` (accepts any `audio/*` or `video/*` mime type plus an explicit document allowlist: PDF, Word, Excel, PowerPoint, plain text/CSV). Wired into the upload `FileInterceptor` as `limits.fileSize` (multer maps an oversized upload to `413 PayloadTooLargeException` automatically) and a `fileFilter` callback (rejects disallowed mime types with `415 UnsupportedMediaTypeException`); multer's own upload-error handling removes any partially-written file for both of these rejection paths, so no extra cleanup code was needed there (unlike the access-check case above).
  - `queries/impl/list-meeting-files.query.ts` + `queries/handlers/list-meeting-files.handler.ts` — dispatched by `GET /meetings/:id/files`, returns the meeting's files ordered by `uploadedAt`.
  - `queries/impl/get-meeting-file.query.ts` + `queries/handlers/get-meeting-file.handler.ts` — dispatched by `GET /meetings/:id/files/:fileId` (download), open to the meeting's owner and participants (`assertMeetingAccess`); returns the full `MeetingFileRecord` (including `storagePath`) for the controller to stream. The controller wraps `fs.createReadStream(file.storagePath)` in a Nest `StreamableFile` with the stored `mimeType`/`name`/`size` as the response's content type, attachment filename, and length.
  - `commands/impl/delete-meeting-file.command.ts` + `commands/handlers/delete-meeting-file.handler.ts` — dispatched by `DELETE /meetings/:id/files/:fileId` (204 on success), restricted to the meeting's owner regardless of who uploaded the file (`access/assert-meeting-owner.ts`'s `assertMeetingOwner`, 403 otherwise); deletes the `MeetingFile` row and then the on-disk file (best-effort `unlink`).
  - `interfaces/meeting-file-result.interface.ts` — shared `MeetingFileResult` return type for the list/upload responses; both handlers use a Prisma `select` that omits `storagePath` so the on-disk path never leaves the API. `interfaces/meeting-file-record.interface.ts` is the internal counterpart (includes `storagePath`) used by the download/delete handlers, which need the real file path.
  - Prisma `MeetingFile` model (`prisma/schema.prisma`): `id`, `name`, `mimeType`, `size`, `storagePath`, `uploadedBy`, `uploadedAt`, `status` (`MeetingFileStatus` enum: `pending` | `processed`, point of extension for future transcription/summarization), `meetingId` (FK to `Meeting`).
  - Uploaded files are written to `apps/api/storage/meeting-files/` (gitignored); the directory is created on module load if missing.
- `test/auth.e2e-spec.ts`, `test/meetings.e2e-spec.ts` and `test/meeting-files.e2e-spec.ts` (the only e2e suites — the scaffold `test/app.e2e-spec.ts` was removed along with `AppController`) drive these endpoints end-to-end over a real `AppModule` + the Postgres instance from `docker-compose.yml`; they generate a unique email per test (`crypto.randomUUID()`) instead of resetting the DB between runs, so tests stay independent without needing DB-reset plumbing.
- `nest-cli.json` sets `sourceRoot: src` and `deleteOutDir: true` (build output goes to `dist/`, cleaned on each build).
- `eslint.config.mjs` is a flat config using `typescript-eslint` `recommendedTypeChecked` plus `eslint-plugin-prettier/recommended`, so `npm run lint` (`--fix`) also applies Prettier formatting — `npm run format` is only needed for a formatting-only pass. `@typescript-eslint/no-explicit-any` is disabled; `no-floating-promises` / `no-unsafe-argument` are downgraded to warnings.
- TypeScript strict mode is enabled (`tsconfig.json`).

## Keeping documentation current

If a change alters this app's architecture (new modules, new module boundaries, new major dependency, changed bootstrap/config setup), update this file (and the root `CLAUDE.md` if it affects the monorepo-level picture) in the same change.
