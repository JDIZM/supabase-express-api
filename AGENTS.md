# AGENTS.md

Project-specific instructions for AI coding assistants (Claude Code, Cursor, GitHub Copilot, etc.).
`CLAUDE.md` is a symlink to this file — update this file, both stay in sync.

## Overview

Node.js/Express multi-tenant API with TypeScript. Supabase for auth, PostgreSQL via Drizzle ORM,
Zod for schema validation, Pino for structured logging. Workspace-scoped RBAC with audit logging.

## Tooling Baselines

- **pnpm 10.17.1** — pinned via `packageManager`; enable with `corepack enable`
- **Node >=22** (Volta-managed: 22.16.0)
- **ESLint 9 flat config** at `eslint.config.js` (typescript-eslint 8)
- **Prettier 3** at `.prettierrc.json` — no semi, double quotes, 100-col, `trailingComma: "es5"`
- **Vitest** for unit tests with coverage
- **TypeScript 5.x strict** with ESM + `.ts` import extensions (`@/` → `src/`)
- **pnpm supply-chain guardrails**: `minimumReleaseAge: 1440` blocks sub-24h releases;
  `onlyBuiltDependencies` allowlist gates install-script execution. Extend the allowlist rather
  than disabling it.

## Common Commands

```bash
pnpm dev           # tsx watch + pino-pretty
pnpm build         # pkgroll ESM bundle
pnpm tsc:check     # strict typecheck, no emit
pnpm lint          # eslint --max-warnings 0
pnpm format        # prettier --write
pnpm format:check  # prettier --check
pnpm test          # vitest --run --coverage
```

### Database

```bash
pnpm migrate:create   # drizzle-kit generate
pnpm migrate          # drizzle-kit migrate
pnpm migrate:push     # drizzle-kit push (dev only)
pnpm seed             # dev seed data
pnpm studio           # drizzle-kit studio
```

## Architecture

### Multi-tenant model (`src/schema.ts`)

- **accounts** — user accounts; optional super-admin flag
- **workspaces** — belong to accounts; house profiles
- **profiles** — per-workspace user presence, linked back to an account
- **workspace_memberships** — role-based (`admin`/`user`) membership per workspace
- **audit_logs** — write-once event trail

UUID PKs, `created_at` timestamps on every table.

### Auth & authorization

- Supabase JWT (`getClaims()`) verified in `middleware/isAuthenticated.ts`
- `middleware/isAuthorized.ts` layers permission checks using the map in `helpers/permissions.ts`
- Levels: account (SuperAdmin) → workspace (Admin/User) → resource (Owner)
- Workspace context comes from the `x-workspace-id` header

### Request flow

1. Rate-limit (`middleware/rateLimiter.ts`) — three tiers (standard/strict/auth)
2. `isAuthenticated` — validates JWT, sets `req.accountId`
3. `validateRequest({ body?, params?, query? })` — Zod validates and overwrites `req.body`
4. `isAuthorized` — checks route permissions for the user's roles
5. Handler in `src/handlers/<resource>/…`
6. `errorHandler` catches `HttpError` and returns `apiResponse.error(...)` envelope

### Config (`src/config.ts`)

Zod schema validates env vars at startup. Missing/invalid values throw with per-field messages.
Add new vars to the schema before reading them elsewhere.

### Logging (`src/helpers/logger.ts`)

Pino with redaction for `password`, `token`, `accessToken`, `refreshToken`, `authorization`,
`req.headers.authorization`, `req.headers.cookie`, and `res.headers['set-cookie']`.
Request IDs come from `x-request-id` (or generated via `randomUUID()`) in `pinoHttp`.

## Patterns to Follow

### Adding a validated route

1. Define Zod schemas in the handler module (or shared schema file).
2. Use `validateRequest({ body, params, query })` instead of inline `safeParse` in the handler.
3. Throw `HttpErrors.<Kind>(...)` for expected failures — `errorHandler` formats the response.
4. Use `apiResponse.success(...)` / `apiResponse.error(...)` for the response envelope.

### Secrets & environment

- Commit only `.env.example` with placeholder values.
- Never commit `.env`, `.env.docker`, or anything containing real keys — `.gitignore` enforces
  this but double-check `git status` before committing.
- Sentry is gated by `FEATURE_FLAG_SENTRY_DEVELOPMENT` in dev.

### Adding a dependency that ships install scripts

Add it to `pnpm.onlyBuiltDependencies` in `package.json`. Do not disable the allowlist globally.

## Conventions & Gotchas

- ESM-only — imports must include the `.ts` extension (e.g. `import { foo } from "./bar.ts"`)
- Drizzle + `drizzle-zod` — keep Zod schemas colocated with the drizzle table definitions
- Use the `HttpErrors` helpers over `throw new Error(...)` so responses stay structured
- Run `pnpm tsc:check && pnpm lint && pnpm format:check` before every commit

## Commit Process

```bash
pnpm tsc:check && pnpm lint && pnpm format:check
git add <specific-files>
git commit -m "type: description"
```

Conventional types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`.

## Environment Setup

```bash
cp .env.example .env
corepack enable
pnpm install
pnpm dev
```

Required env vars (see `src/config.ts` for the full schema):

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (and optional `SUPABASE_SECRET_KEY` for admin ops)
- `POSTGRES_*` connection vars (host/port/user/password/db)
- `APP_URL`, `PORT`, `NODE_ENV`
