import { randomUUID } from 'node:crypto'
import express, { type Application } from 'express'
import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Shared setup for the authorization suite (src/middleware/authorization.test.ts).
//
// This suite exercises the REAL middleware chain (isAuthenticated, checkAccountStatus,
// isAuthorized) and the REAL route wiring (routes/index.ts, admin.ts) against an in-memory
// substitute for Postgres/Supabase, so we're testing the actual authorization logic rather than
// a re-implementation of it. Only the external boundaries — the DB client and the Supabase auth
// client — are faked.
// ---------------------------------------------------------------------------

// accountId -> role, keyed by workspaceId. A bearer token IS the accountId for these tests
// (see the verifyToken mock below), so tests can forge a caller identity directly.
export const memberships = new Map<string, Map<string, 'admin' | 'user'>>()

export function setMembership(
  workspaceId: string,
  accountId: string,
  role: 'admin' | 'user'
): void {
  const forWorkspace = memberships.get(workspaceId) ?? new Map()
  forWorkspace.set(accountId, role)
  memberships.set(workspaceId, forWorkspace)
}

export function clearMemberships(): void {
  memberships.clear()
}

vi.mock('@/handlers/auth/auth.methods.ts', () => ({
  // The bearer token is the accountId directly — this suite is about authorization
  // (isAuthenticated/isAuthorized), not about Supabase JWT verification itself.
  verifyToken: vi.fn(async (token: string) => (token ? { sub: token } : null)),
}))

vi.mock('@/handlers/memberships/memberships.methods.ts', () => ({
  isValidRole: (role: string) => role === 'admin' || role === 'user',
  createMembership: vi.fn(
    async (workspaceId: string, accountId: string, role: 'admin' | 'user') => {
      setMembership(workspaceId, accountId, role)
      return { uuid: randomUUID(), workspaceId, accountId, role, createdAt: new Date() }
    }
  ),
  checkMembership: vi.fn(async (accountId: string, workspaceId: string) => {
    const role = memberships.get(workspaceId)?.get(accountId)
    return role ? [true, role] : [false, '']
  }),
}))

vi.mock('@/handlers/workspaces/workspaces.methods.ts', () => ({
  createDbWorkspace: vi.fn(async (workspace: { name: string; accountId: string }) => ({
    uuid: randomUUID(),
    name: workspace.name,
    accountId: workspace.accountId,
    description: null,
    createdAt: new Date(),
  })),
}))

vi.mock('@/handlers/profiles/profiles.methods.ts', () => ({
  createDbProfile: vi.fn(
    async (profile: { name: string; accountId: string; workspaceId: string }) => ({
      uuid: randomUUID(),
      ...profile,
      createdAt: new Date(),
    })
  ),
  getProfileById: vi.fn(async () => []),
}))

vi.mock('@/handlers/accounts/accounts.methods.ts', () => ({
  createDbAccount: vi.fn(async () => randomUUID()),
}))

vi.mock('@/services/supabase.ts', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(async ({ email }: { email: string }) => ({
        data: { user: { id: randomUUID(), email } },
        error: null,
      })),
    },
  },
  getSupabaseAdmin: vi.fn(),
}))

// A dumb-but-sufficient stand-in for the Drizzle/Postgres client. The routes exercised in this
// suite never reach a handler that needs real query results EXCEPT the account-status lookup
// (which every authenticated route runs) and the workspace-creation transaction — both are
// satisfied by an always-"active account exists" response.
vi.mock('@/services/db/drizzle.ts', () => {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: async () => [{ status: 'active', uuid: 'stub-account' }],
    execute: async () => [{ status: 'active', uuid: 'stub-account' }],
    innerJoin: () => chain,
    then: (resolve: (v: unknown[]) => unknown) => resolve([{ status: 'active' }]),
  }

  const db = {
    select: () => chain,
    insert: () => ({ values: () => ({ returning: async () => [{}] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [{}] }) }) }),
    delete: () => ({ where: async () => undefined }),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
    query: {
      workspaces: { findFirst: vi.fn(async () => null) },
      accounts: { findFirst: vi.fn(async () => null) },
    },
  }

  return { db }
})

// Build the app under test using the REAL route + middleware wiring.
export async function buildApp(): Promise<Application> {
  vi.resetModules()
  const { routes } = await import('@/routes/index.ts')
  const { errorHandler } = await import('@/middleware/errorHandler.ts')

  const app = express()
  app.use(express.json())
  routes(app)
  app.use(errorHandler)
  return app
}

export const bearer = (accountId: string): string => `Bearer ${accountId}`
