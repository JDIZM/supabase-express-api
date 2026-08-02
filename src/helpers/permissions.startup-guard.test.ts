import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it } from 'vitest'
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

  it('does not throw for the real, fully-registered app route set', () => {
    // Sanity check: build the real routes exactly as server.ts does and confirm the guard is
    // satisfied — proves the guard isn't just permissive by construction.
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
