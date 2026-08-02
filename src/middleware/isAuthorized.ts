import { checkMembership } from '@/handlers/memberships/memberships.methods.ts'
import { getProfileById } from '@/handlers/profiles/profiles.methods.ts'
import { HttpErrors, HttpStatusCode } from '@/helpers/Http.ts'
import type { Route } from '@/helpers/index.ts'
import { logger, permissions } from '@/helpers/index.ts'
import { ROLES, type Method } from '@/helpers/permissions.ts'
import { apiResponse } from '@/helpers/response.ts'
import { accounts } from '@/schema.ts'
import { db } from '@/services/db/drizzle.ts'
import { eq } from 'drizzle-orm'
import type { NextFunction, Request, Response } from 'express'

const ResourceType = {
  ACCOUNT: 'account',
  PROFILE: 'profile',
} as const

// Matches /workspaces/:id, /workspaces/:id/members, /workspaces/:id/members/:memberId, etc.
// Used to robustly derive the workspace id carried in the URL for a workspace-scoped route,
// rather than string-matching req.originalUrl.
const WORKSPACE_SCOPED_ROUTE = /^\/workspaces\/:id(\/|$)/

/**
 * Resolve the single workspace id a request is authorized against.
 *
 * Handlers act on `req.params.id` (the path), while historically only the `x-workspace-id`
 * header was checked for membership — allowing a caller to pass membership checks against a
 * workspace they belong to while the write/read actually targets a different workspace id in
 * the path. Resolve ONE id here, preferring the path, and require the two to agree when both
 * are present.
 */
function resolveWorkspaceId(
  req: Request,
  routeKey: Route
): { ok: true; workspaceId: string } | { ok: false } {
  const headerWorkspaceId = (req.headers['x-workspace-id'] as string | undefined) || ''
  const pathWorkspaceId = WORKSPACE_SCOPED_ROUTE.test(routeKey) ? req.params?.id || '' : ''

  if (pathWorkspaceId && headerWorkspaceId && pathWorkspaceId !== headerWorkspaceId) {
    return { ok: false }
  }

  return { ok: true, workspaceId: pathWorkspaceId || headerWorkspaceId }
}

export function determineResourceType(
  route: Route
): '' | (typeof ResourceType)[keyof typeof ResourceType] {
  const keys = Object.values(ResourceType)
  const resourceType = keys.find((key) => route.includes(key))
  return resourceType ?? ''
}

/**
 * Check if the user is the owner of a resource.
 */
const isOwner = async (id: string, resourceId: string, resourceType: string): Promise<boolean> => {
  switch (resourceType) {
    case ResourceType.ACCOUNT:
      return id === resourceId
    // Needs to verify the accountId associated with the profile.
    case ResourceType.PROFILE: {
      const [profile] = await getProfileById(resourceId)

      if (profile) {
        logger.debug({ msg: 'isOwner: profile', id, resourceId, accountId: profile.accountId })

        return profile.accountId === id
      }

      return false
    }

    default:
      return false
  }
}

export const isAuthorized = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { accountId } = req

    const routeMethod = req.method as Method
    const routeKey = (req.baseUrl + req.route.path) as Route

    // Resolve the single workspace id this request is authorized against. Handlers act on
    // req.params.id; membership must be checked against that SAME id, not independently against
    // whatever the x-workspace-id header claims. A disagreeing header is rejected outright.
    const resolved = resolveWorkspaceId(req, routeKey)

    if (!resolved.ok) {
      logger.error(
        { routeKey, routeMethod, paramId: req.params?.id, header: req.headers['x-workspace-id'] },
        'isAuthorized: workspace id in path and x-workspace-id header disagree'
      )

      const response = apiResponse.error(
        HttpErrors.BadRequest('Workspace id in the path and x-workspace-id header must match')
      )
      res.status(response.code).json(response)
      return
    }

    // req.workspaceId is a single resolved value from here on — handlers already read it, so
    // this keeps them correct without needing to touch handler code.
    req.workspaceId = resolved.workspaceId
    const { workspaceId } = req

    logger.debug(`Authorizing for workspace id: ${workspaceId}`)

    const resourcePermissions = permissions.permissions.get(routeKey)
    const resourcePermission = resourcePermissions && resourcePermissions.permissions[routeMethod]
    // Fail closed: a route with no permissions entry defaults to requiring authentication.
    const requiresAuth = resourcePermissions ? resourcePermissions.authenticated : true
    // A route is genuinely public only if it has an explicit entry saying so (root, login, signup).
    const isPublicRoute = resourcePermissions !== undefined && !requiresAuth

    logger.debug(
      { requestId: req.id, method: req.method, path: req.path, accountId, workspaceId },
      'isAuthorized: request'
    )

    logger.debug(
      {
        routeKey,
        routeMethod,
        workspaceId,
        resourcePermissions,
        resourcePermission,
      },
      'isAuthorized: middleware'
    )

    if (requiresAuth && !accountId) {
      logger.error(
        { accountId, routeKey, resourcePermission, routeMethod, workspaceId },
        'Unauthorized user'
      )

      res.status(401).send('Unauthorized')
      return
    }

    // Super admin only has access to routes that have super admin permissions enabled.
    if (resourcePermissions?.super && accountId) {
      const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.uuid, accountId))
        .execute()

      if (!account) {
        throw new Error('DB User not found')
      }

      const { isSuperAdmin } = account

      if (!isSuperAdmin) {
        logger.error({ routeKey, accountId, workspaceId }, 'isAuthorized: Not a super admin')

        throw new Error(`Forbidden: account id: ${accountId} is not a super admin`)
      }

      logger.debug(
        { routeKey, workspaceId, isSuperAdmin },
        `isAuthorized: Super admin for account id: ${accountId}`
      )

      return next()
    }

    if (isPublicRoute) {
      logger.debug({ routeKey, workspaceId }, 'isAuthorized: Public route')

      return next()
    }

    if (resourcePermission === undefined) {
      // Registered route/method with no permissions entry — fail closed rather than allow.
      // NB: '' is a valid, present role meaning "any authenticated user" — only an absent
      // (undefined) entry should be denied here, not a falsy-but-present '' value.
      logger.error(
        { routeKey, routeMethod, workspaceId },
        'isAuthorized: No permissions entry for this route/method — denying by default'
      )

      const response = apiResponse.error(HttpErrors.Forbidden())
      res.status(response.code).json(response)
      return
    }

    // An empty-string role means "any authenticated user, no specific role/workspace membership
    // required" (eg. POST /workspaces, GET /me) — distinct from an absent (undefined) entry.
    if (resourcePermission === '') {
      return next()
    }

    // An owner has access to all resources they own regardless of the workspace.
    if (resourcePermission.includes(ROLES.Owner) && accountId) {
      // Check if the user is the owner of the resource
      const resourceId = req.params?.id || ''
      const resourceType = determineResourceType(routeKey)

      // Some resources require a db call to check if the user is the owner.
      const isUserOwner = await isOwner(accountId, resourceId, resourceType)

      logger.debug({ routeKey, accountId, workspaceId, isUserOwner }, 'isAuthorized: Owner')

      if (isUserOwner) {
        return next()
      }

      logger.error(
        { accountId, resourceId, routeKey, workspaceId },
        'isAuthorized: Not the owner of the resource'
      )

      throw new Error(`Forbidden: Not the owner of the resource with id: ${req.params?.id}`)
    }

    // Ensure the user is a member of the workspace and has the required role, using the resolved workspace id.
    if (workspaceId && accountId) {
      const [isMember, role] = await checkMembership(accountId, workspaceId)

      logger.debug({ isMember, role }, 'isAuthorized: checkMembership')

      if (!isMember) {
        throw new Error(`Forbidden: Not a member of the workspace with id: ${workspaceId}`)
      }

      if (isMember && (resourcePermission.includes(role) || role === ROLES.Admin)) {
        return next()
      }
    }

    const response = apiResponse.error(HttpErrors.Forbidden())
    res.status(response.code).json(response)
    return
  } catch (err) {
    const response = apiResponse.error(err as Error, HttpStatusCode.FORBIDDEN)

    res.status(response.code).json(response)
    return
  }
}
