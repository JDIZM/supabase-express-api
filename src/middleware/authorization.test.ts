import { randomUUID } from 'node:crypto'
import type { Application, NextFunction, Request, Response } from 'express'
import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bearer,
  buildApp,
  clearMemberships,
  memberships,
  setMembership,
} from '@/test-support/authorization-app.ts'

describe('workspace authorization', () => {
  let app: Application

  beforeEach(async () => {
    clearMemberships()
    app = await buildApp()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a membership write to a workspace whose id in the path differs from the header, across a fresh signup flow', async () => {
    const signup = await request(app)
      .post('/signup')
      .send({ email: 'caller@example.com', password: 'password123!', fullName: 'Caller' })
    expect(signup.status).toBe(200)

    const callerId = randomUUID()
    const createWorkspaceRes = await request(app)
      .post('/workspaces')
      .set('Authorization', bearer(callerId))
      .send({ name: 'Caller Co' })
    expect(createWorkspaceRes.status).toBe(200)
    const callerWorkspaceId = createWorkspaceRes.body.data.workspace.uuid

    // A separate workspace the caller is NOT a member of.
    const otherWorkspaceId = randomUUID()
    setMembership(otherWorkspaceId, randomUUID(), 'admin')

    const { createMembership } = await import('@/handlers/memberships/memberships.methods.ts')
    vi.mocked(createMembership).mockClear()

    // The caller targets the other workspace via the path, while presenting their OWN workspace
    // id in the header (where membership would otherwise pass).
    const res = await request(app)
      .post(`/workspaces/${otherWorkspaceId}/members`)
      .set('Authorization', bearer(callerId))
      .set('x-workspace-id', callerWorkspaceId)
      .send({ email: 'caller@example.com', role: 'admin' })

    expect(res.status).toBe(400)
    // No membership row was created in the other workspace as a side effect of the attempt.
    expect(createMembership).not.toHaveBeenCalled()
    expect(memberships.get(otherWorkspaceId)?.size).toBe(1) // only the original admin
  })

  it('rejects a request when x-workspace-id is sent as a duplicate header rather than a single value', async () => {
    const accountId = randomUUID()
    const workspaceId = randomUUID()
    setMembership(workspaceId, accountId, 'admin')

    // Node's HTTP parser combines two request header lines with the same name into a single
    // comma-joined value (verified against a raw socket: sending the header twice produces
    // exactly this string) before Express ever sees it — this is what a caller sending the
    // header twice actually produces at runtime, for both req.headers[name] and req.get(name).
    const duplicatedHeaderValue = `${workspaceId}, ${randomUUID()}`

    const res = await request(app)
      .get(`/workspaces/${workspaceId}`)
      .set('Authorization', bearer(accountId))
      .set('x-workspace-id', duplicatedHeaderValue)

    // A duplicated header must not resolve to a value that matches the path id and lets the
    // request through as if a single, agreeing header was sent — it must be rejected.
    expect(res.status).not.toBe(200)
  })

  const mismatchCases: Array<{ method: 'get' | 'post' | 'put' | 'delete'; path: string }> = [
    { method: 'get', path: '/workspaces/PATH_ID' },
    { method: 'get', path: '/workspaces/PATH_ID/members' },
    { method: 'post', path: '/workspaces/PATH_ID/members' },
    { method: 'put', path: '/workspaces/PATH_ID/members/some-member-id/role' },
    { method: 'delete', path: '/workspaces/PATH_ID/members/some-member-id' },
    { method: 'delete', path: '/workspaces/PATH_ID' },
  ]

  it.each(mismatchCases)(
    'rejects $method $path with 400 when path and header workspace ids disagree',
    async ({ method, path }) => {
      const accountId = randomUUID()
      const pathWorkspaceId = randomUUID()
      const headerWorkspaceId = randomUUID()
      setMembership(pathWorkspaceId, accountId, 'admin')
      setMembership(headerWorkspaceId, accountId, 'admin')
      const url = path.replace('PATH_ID', pathWorkspaceId)

      const res = await request(app)
        [method](url)
        .set('Authorization', bearer(accountId))
        .set('x-workspace-id', headerWorkspaceId)
        .send({ role: 'admin', email: 'x@example.com' })

      expect(res.status).toBe(400)
    }
  )

  it('a member of workspace A gets the same not-authorized response for workspace B as a non-member', async () => {
    const accountId = randomUUID()
    const workspaceA = randomUUID()
    const workspaceB = randomUUID()
    setMembership(workspaceA, accountId, 'user')
    // accountId is NOT a member of workspaceB

    const res = await request(app)
      .get(`/workspaces/${workspaceB}`)
      .set('Authorization', bearer(accountId))
      .set('x-workspace-id', workspaceB)

    // Matches this repo's existing convention for "not authorized for this resource":
    // isAuthorized throws a generic Forbidden, caught and returned as 403.
    expect(res.status).toBe(403)
  })

  it('denies a route registered without a permissions entry instead of treating it as public', async () => {
    const throwawayApp = express()
    throwawayApp.use(express.json())
    const { isAuthenticated } = await import('@/middleware/isAuthenticated.ts')
    const { isAuthorized } = await import('@/middleware/isAuthorized.ts')
    // Deliberately NOT registered in the permissions map.
    throwawayApp.get(
      '/__unregistered-test-route',
      isAuthenticated,
      isAuthorized,
      (_req: Request, res: Response) => res.status(200).send('should not be reachable')
    )
    throwawayApp.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      res.status(500).send(err.message)
    })
    const accountId = randomUUID()

    const res = await request(throwawayApp)
      .get('/__unregistered-test-route')
      .set('Authorization', bearer(accountId))

    expect(res.status).toBe(403)
  })

  // NOTE: GET '/' is deliberately excluded here. It's flagged `authenticated: false` in the
  // permissions map (so isAuthenticated/isAuthorized correctly treat it as public — verified
  // above via the isPublicRoute path), but its route wiring also chains `checkAccountStatus`,
  // which unconditionally 401s when there's no accountId regardless of the route's public flag.
  // That's a pre-existing inconsistency on main, unrelated to the three bugs this change fixes,
  // and out of scope to touch here (see PR body / final report).
  const publicRoutes: Array<{ method: 'post'; path: string; body?: object }> = [
    { method: 'post', path: '/login', body: { email: 'a@b.com', password: 'password123!' } },
    { method: 'post', path: '/signup', body: { email: 'a@b.com', password: 'password123!' } },
  ]

  it.each(publicRoutes)(
    '$method $path remains reachable without authentication',
    async ({ method, path, body }) => {
      const res = await request(app)[method](path).send(body)

      // Public routes must not be blocked by auth (401/403); whatever they return otherwise
      // (200, or a downstream validation/auth-provider error) is out of scope here.
      expect([401, 403]).not.toContain(res.status)
    }
  )

  it('a user role cannot perform an admin-only action (no regression)', async () => {
    const accountId = randomUUID()
    const workspaceId = randomUUID()
    setMembership(workspaceId, accountId, 'user')

    // DELETE /workspaces/:id requires Admin.
    const res = await request(app)
      .delete(`/workspaces/${workspaceId}`)
      .set('Authorization', bearer(accountId))
      .set('x-workspace-id', workspaceId)

    expect(res.status).toBe(403)
  })

  it('PATCH /workspaces/:id rejects a user role with 403', async () => {
    const userId = randomUUID()
    const workspaceId = randomUUID()
    setMembership(workspaceId, userId, 'user')

    const res = await request(app)
      .patch(`/workspaces/${workspaceId}`)
      .set('Authorization', bearer(userId))
      .set('x-workspace-id', workspaceId)
      .send({ name: 'New name' })

    expect(res.status).toBe(403)
  })

  it('PATCH /workspaces/:id does not reject an admin role, like DELETE', async () => {
    const adminId = randomUUID()
    const workspaceId = randomUUID()
    setMembership(workspaceId, adminId, 'admin')

    const res = await request(app)
      .patch(`/workspaces/${workspaceId}`)
      .set('Authorization', bearer(adminId))
      .set('x-workspace-id', workspaceId)
      .send({ name: 'New name' })

    expect(res.status).not.toBe(403)
  })
})
