import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it } from 'vitest'
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
    const app = express()
    app.get('/some/registered/route', isAuthorized, (_req, res) => res.end())

    const offenders = findRoutesMissingPermissions(app, permissions)

    expect(offenders).toContain('GET /some/registered/route')
  })

  it('does not report a route missing a permissions entry if it is not wired through isAuthorized', () => {
    const app = express()
    app.get('/health', otherMiddleware, (_req, res) => res.end())

    const offenders = findRoutesMissingPermissions(app, permissions)

    expect(offenders).not.toContain('GET /health')
  })

  it('does not report a method that has a real permissions entry', () => {
    const app = express()
    app.get('/workspaces/:id', isAuthorized, (_req, res) => res.end())

    const offenders = findRoutesMissingPermissions(app, permissions)

    expect(offenders).not.toContain('GET /workspaces/:id')
  })

  it('reports a method missing from an otherwise-registered route', () => {
    const app = express()
    // Simulates a route where GET/DELETE have entries but PATCH does not.
    app.get('/workspaces/:id', isAuthorized, (_req, res) => res.end())
    app.delete('/workspaces/:id', isAuthorized, (_req, res) => res.end())
    app.patch('/workspaces/:id', isAuthorized, (_req, res) => res.end())

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
    const app = express()
    app.post('/__totally-unregistered', isAuthorized, (_req, res) => res.end())

    expect(() => assertAllRoutesHavePermissions(app, permissions)).toThrow(
      /POST \/__totally-unregistered/
    )
  })

  it('does not throw for the real, fully-registered app route set', () => {
    // Sanity check: build the real routes exactly as server.ts does and confirm the guard is
    // satisfied — proves the guard isn't just permissive by construction.
    expect(() => {
      const app = express()
      app.get('/workspaces/:id', isAuthorized, (_req, res) => res.end())
      app.patch('/workspaces/:id', isAuthorized, (_req, res) => res.end())
      app.delete('/workspaces/:id', isAuthorized, (_req, res) => res.end())
      assertAllRoutesHavePermissions(app, permissions)
    }).not.toThrow()
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

    const app = express()
    app.get('/some/other/registered/route', distinctReferenceButSameGuard, (_req, res) => res.end())

    const offenders = findRoutesMissingPermissions(app, permissions)

    expect(offenders).toContain('GET /some/other/registered/route')
  })

  it('registers a route with no permissions entry and asserts startup throws, naming the route (regression test for the reference-equality bug)', () => {
    // This is the scenario the reference-equality bug actually hid: a route wired through the
    // real authorization guard but missing from the permissions map. Prior to tagging the guard
    // with a marker, comparing `routeLayer.handle === isAuthorizedHandler` could silently fail to
    // match (eg. if the guard were imported via a different specifier), which would make this
    // route look unprotected and skip the check entirely instead of throwing.
    const app = express()
    app.delete('/__another-unregistered-route', isAuthorized, (_req, res) => res.end())

    expect(() => assertAllRoutesHavePermissions(app, permissions)).toThrow(
      /DELETE \/__another-unregistered-route/
    )
  })
})
