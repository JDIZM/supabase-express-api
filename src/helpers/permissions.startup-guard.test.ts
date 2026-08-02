import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildRouterApp } from '@/test-support/route-app.ts'
import {
  assertAllRoutesHavePermissions,
  findRoutesMissingPermissions,
  markAsAuthorizationGuard,
  permissions,
} from './permissions.ts'

// A stand-in for the real isAuthorized middleware, tagged the same way the real one is (see
// src/middleware/isAuthorized.ts). Using a local fake here — rather than importing the real
// middleware — keeps this suite a focused unit test of the startup guard itself, without pulling
// in the real middleware's dependency chain (db/config/etc).
const isAuthorized = markAsAuthorizationGuard(
  (_req: Request, _res: Response, next: NextFunction): void => next()
)
const otherMiddleware = (_req: Request, _res: Response, next: NextFunction): void => next()

// Importing the real route table (see the last describe block) reaches the db module, which opens
// a Postgres connection at import time and calls process.exit(1) if it fails. Reading the router
// needs no database, so the connection is stubbed out rather than making route wiring untestable
// without live infrastructure.
vi.mock('@/services/db/drizzle.ts', () => ({ db: {} }))

describe('assertAllRoutesHavePermissions', () => {
  it('reports a registered route missing a permissions entry, naming the (path, method) pair', () => {
    const app = buildRouterApp([
      { method: 'get', path: '/some/registered/route', middleware: [isAuthorized] },
    ])

    const offenders = findRoutesMissingPermissions(app, permissions)

    expect(offenders).toContain('GET /some/registered/route')
  })

  it('does not report a route missing a permissions entry if it is not wired through isAuthorized', () => {
    const app = buildRouterApp([{ method: 'get', path: '/health', middleware: [otherMiddleware] }])

    const offenders = findRoutesMissingPermissions(app, permissions)

    expect(offenders).not.toContain('GET /health')
  })

  it('does not report a method that has a real permissions entry', () => {
    const app = buildRouterApp([
      { method: 'get', path: '/workspaces/:id', middleware: [isAuthorized] },
    ])

    const offenders = findRoutesMissingPermissions(app, permissions)

    expect(offenders).not.toContain('GET /workspaces/:id')
  })

  it('reports a method missing from an otherwise-registered route', () => {
    // Simulates a route where GET/DELETE have entries but PATCH does not.
    const app = buildRouterApp([
      { method: 'get', path: '/workspaces/:id', middleware: [isAuthorized] },
      { method: 'delete', path: '/workspaces/:id', middleware: [isAuthorized] },
      { method: 'patch', path: '/workspaces/:id', middleware: [isAuthorized] },
    ])

    const strippedPermissions = new Map(permissions)
    const entry = strippedPermissions.get('/workspaces/:id')
    if (entry) {
      strippedPermissions.set('/workspaces/:id', {
        ...entry,
        permissions: { GET: entry.permissions.GET ?? '', DELETE: entry.permissions.DELETE ?? '' },
      })
    }

    const offenders = findRoutesMissingPermissions(app, strippedPermissions)

    expect(offenders).toContain('PATCH /workspaces/:id')
  })

  it('throws, naming the offender, when a registered route has no permissions entry', () => {
    const app = buildRouterApp([
      { method: 'post', path: '/__totally-unregistered', middleware: [isAuthorized] },
    ])

    expect(() => assertAllRoutesHavePermissions(app, permissions)).toThrow(
      /POST \/__totally-unregistered/
    )
  })

  it('does not throw when every registered method has a permissions entry', () => {
    // Named for what it actually covers. It used to claim it built "the real routes exactly as
    // server.ts does", which it never did — it wires three paths by hand. The real route set is
    // exercised in the describe block below.
    const app = buildRouterApp([
      { method: 'get', path: '/workspaces/:id', middleware: [isAuthorized] },
      { method: 'patch', path: '/workspaces/:id', middleware: [isAuthorized] },
      { method: 'delete', path: '/workspaces/:id', middleware: [isAuthorized] },
    ])

    expect(() => assertAllRoutesHavePermissions(app, permissions)).not.toThrow()
  })

  it('detects the guard via its marker even when the middleware is a distinct function reference from another tagged instance (defends against cross-module-instance identity mismatches)', () => {
    // Simulates isAuthorized having been resolved as a second, separate module instance — eg.
    // under a loader where the route wiring's import specifier and this guard's import specifier
    // don't dedupe to the same module record. A naive `handle === isAuthorized` reference check
    // would treat this as "not the authorization guard" and silently fail to protect the route,
    // even though both instances are tagged as the real guard.
    const distinctReferenceButSameGuard = markAsAuthorizationGuard(
      (_req: Request, _res: Response, next: NextFunction) => next()
    )
    expect(distinctReferenceButSameGuard).not.toBe(isAuthorized)

    const app = buildRouterApp([
      {
        method: 'get',
        path: '/some/other/registered/route',
        middleware: [distinctReferenceButSameGuard],
      },
    ])

    const offenders = findRoutesMissingPermissions(app, permissions)

    expect(offenders).toContain('GET /some/other/registered/route')
  })

  it('registers a route with no permissions entry and asserts startup throws, naming the route (regression test for the reference-equality bug)', () => {
    // This is the scenario the reference-equality bug actually hid: a route wired through the
    // real authorization guard but missing from the permissions map. Prior to tagging the guard
    // with a marker, comparing `routeLayer.handle === isAuthorizedHandler` could silently fail to
    // match (eg. if the guard were imported via a different specifier), which would make this
    // route look unprotected and skip the check entirely instead of throwing.
    const app = buildRouterApp([
      { method: 'delete', path: '/__another-unregistered-route', middleware: [isAuthorized] },
    ])

    expect(() => assertAllRoutesHavePermissions(app, permissions)).toThrow(
      /DELETE \/__another-unregistered-route/
    )
  })
})

describe('the real application route set', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // Every test above builds a synthetic app, so all of them passed while the actual app could not
  // start: the guard demanded a per-method permission, but `/`, `/login` and `/signup` are declared
  // public at the path level (`{ permissions: {}, authenticated: false }`), so it named all three as
  // undeclared and threw. Registering the REAL routes is the only assertion that could have caught
  // it — a synthetic app can only prove the guard agrees with the fixture it was handed.
  it('starts up clean, so a route or permission change cannot break boot without failing here first', async () => {
    // The route modules pull in config.ts, which validates the whole runtime env at module load.
    // These values are never used — nothing here opens a connection — they just let the import
    // succeed so the real route table can be registered. Stubbed rather than assigned so they are
    // undone afterwards and no later test inherits them.
    vi.stubEnv('SUPABASE_URL', 'https://startup-guard-test.supabase.co')
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'not-used')

    const { routes } = await import('@/routes/index.ts')
    const { adminRoutes } = await import('@/routes/admin.ts')
    const app = express()
    routes(app)
    adminRoutes(app)

    expect(() => assertAllRoutesHavePermissions(app, permissions)).not.toThrow()
  })

  it('declares the public routes as public rather than as merely unlisted', () => {
    // Guards the distinction the bug turned on. An empty `permissions` object is not the same as a
    // missing entry: the first is a decision (no auth required on this path), the second is an
    // oversight that must fail closed. If these entries were deleted, the routes would keep working
    // — the guard skips them either way — but would become unauthenticated by accident.
    for (const path of ['/', '/login', '/signup'] as const) {
      expect(permissions.get(path)?.authenticated).toBe(false)
    }
  })
})
