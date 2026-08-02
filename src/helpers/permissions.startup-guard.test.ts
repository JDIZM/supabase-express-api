import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it } from 'vitest'
import {
  assertAllRoutesHavePermissions,
  findRoutesMissingPermissions,
  permissions,
} from './permissions.ts'

const isAuthorized = (_req: Request, _res: Response, next: NextFunction): void => next()
const otherMiddleware = (_req: Request, _res: Response, next: NextFunction): void => next()

describe('assertAllRoutesHavePermissions', () => {
  it('reports a registered route missing a permissions entry, naming the (path, method) pair', () => {
    const app = express()
    app.get('/some/registered/route', isAuthorized, (_req, res) => res.end())

    const offenders = findRoutesMissingPermissions(app, permissions, isAuthorized)

    expect(offenders).toContain('GET /some/registered/route')
  })

  it('does not report a route missing a permissions entry if it is not wired through isAuthorized', () => {
    const app = express()
    app.get('/health', otherMiddleware, (_req, res) => res.end())

    const offenders = findRoutesMissingPermissions(app, permissions, isAuthorized)

    expect(offenders).not.toContain('GET /health')
  })

  it('does not report a method that has a real permissions entry', () => {
    const app = express()
    app.get('/workspaces/:id', isAuthorized, (_req, res) => res.end())

    const offenders = findRoutesMissingPermissions(app, permissions, isAuthorized)

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

    const offenders = findRoutesMissingPermissions(app, strippedPermissions, isAuthorized)

    expect(offenders).toContain('PATCH /workspaces/:id')
  })

  it('throws, naming the offender, when a registered route has no permissions entry', () => {
    const app = express()
    app.post('/__totally-unregistered', isAuthorized, (_req, res) => res.end())

    expect(() => assertAllRoutesHavePermissions(app, permissions, isAuthorized)).toThrow(
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
      assertAllRoutesHavePermissions(app, permissions, isAuthorized)
    }).not.toThrow()
  })
})
