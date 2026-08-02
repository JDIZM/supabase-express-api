import { logger } from './logger.ts'

export const API_ROUTES = {
  root: '/',
  login: '/login',
  signUp: '/signup',
  me: '/me',
  accounts: '/accounts',
  accountById: '/accounts/:id',
  // profiles: "/profiles", // Removed - access through workspace context
  // profileById: "/profiles/:id", // Removed - access through workspace context
  workspaces: '/workspaces',
  workspaceById: '/workspaces/:id',
  workspaceProfile: '/workspaces/:id/profile',
  workspaceMembers: '/workspaces/:id/members',
  workspaceMemberRole: '/workspaces/:id/members/:memberId/role',
  workspaceMemberRemove: '/workspaces/:id/members/:memberId',
  // Admin routes
  adminAccounts: '/admin/accounts',
  adminAccountRole: '/admin/accounts/:id/role',
  adminAccountStatus: '/admin/accounts/:id/status',
  adminWorkspaces: '/admin/workspaces',
  adminWorkspaceById: '/admin/workspaces/:id',
  adminMemberships: '/admin/memberships',
  adminAuditLogs: '/admin/audit-logs',
  adminAuditLogStats: '/admin/audit-logs/stats',
} as const

export type RouteName = keyof typeof API_ROUTES

export type Route = (typeof API_ROUTES)[RouteName]

export type Routes = Route[]

export const ROLES = {
  Admin: 'admin',
  User: 'user',
  Owner: 'owner',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES] | ''

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type Claims = [Role, Method]

export type ResourcePermissions = {
  [Method: string]: Role
}

export type ResourceMetadata = {
  // Defines if the route requires authentication.
  // If true, the route is only accessible to authenticated users.
  authenticated: boolean
  // A super user only route.
  // If true, the route is only accessible to super users.
  super?: boolean
}

export type ResourceWithMeta = {
  permissions: ResourcePermissions
} & ResourceMetadata

export type PermissionsMap = Map<Route, ResourceWithMeta>

export const permissions: PermissionsMap = new Map()

permissions.set(API_ROUTES.root, { permissions: {}, authenticated: false })
permissions.set(API_ROUTES.login, { permissions: {}, authenticated: false })
permissions.set(API_ROUTES.signUp, { permissions: {}, authenticated: false })

permissions.set(API_ROUTES.me, {
  permissions: { GET: '' },
  authenticated: true,
})

permissions.set(API_ROUTES.accounts, {
  permissions: { GET: '', POST: '' },
  authenticated: true,
  super: true,
})

permissions.set(API_ROUTES.accountById, {
  permissions: { GET: ROLES.Owner, POST: ROLES.Owner, PATCH: ROLES.Owner },
  authenticated: true,
})

// Profile permissions removed - profiles accessed through workspace context

permissions.set(API_ROUTES.workspaces, {
  permissions: { GET: '', POST: '' },
  authenticated: true,
})

permissions.set(API_ROUTES.workspaceById, {
  // PATCH mutates the workspace, so it requires Admin — consistent with DELETE and with
  // the member-management routes below (POST/PUT/DELETE all require Admin).
  permissions: { GET: ROLES.User, PATCH: ROLES.Admin, DELETE: ROLES.Admin },
  authenticated: true,
})

permissions.set(API_ROUTES.workspaceProfile, {
  permissions: { PATCH: ROLES.User },
  authenticated: true,
})

permissions.set(API_ROUTES.workspaceMembers, {
  permissions: { GET: ROLES.User, POST: ROLES.Admin },
  authenticated: true,
})

permissions.set(API_ROUTES.workspaceMemberRole, {
  permissions: { PUT: ROLES.Admin },
  authenticated: true,
})

permissions.set(API_ROUTES.workspaceMemberRemove, {
  permissions: { DELETE: ROLES.Admin },
  authenticated: true,
})

// Admin routes - all require SuperAdmin
permissions.set(API_ROUTES.adminAccounts, {
  permissions: { GET: '', POST: '' },
  authenticated: true,
  super: true,
})

permissions.set(API_ROUTES.adminAccountRole, {
  permissions: { PUT: '' },
  authenticated: true,
  super: true,
})

permissions.set(API_ROUTES.adminAccountStatus, {
  permissions: { PUT: '' },
  authenticated: true,
  super: true,
})

permissions.set(API_ROUTES.adminWorkspaces, {
  permissions: { GET: '', POST: '' },
  authenticated: true,
  super: true,
})

permissions.set(API_ROUTES.adminWorkspaceById, {
  permissions: { DELETE: '' },
  authenticated: true,
  super: true,
})

permissions.set(API_ROUTES.adminMemberships, {
  permissions: { GET: '' },
  authenticated: true,
  super: true,
})

permissions.set(API_ROUTES.adminAuditLogs, {
  permissions: { GET: '' },
  authenticated: true,
  super: true,
})

permissions.set(API_ROUTES.adminAuditLogStats, {
  permissions: { GET: '' },
  authenticated: true,
  super: true,
})

logger.info(permissions, 'route permissions set')

/**
 * Express internals we need to walk the real registered router stack. Express 4 exposes this as
 * `app._router.stack`; each layer with a `.route` corresponds to one app.VERB(path, ...) call,
 * and `route.stack` holds the middleware chain registered for that (path, method) pair.
 */
interface ExpressRouteLayer {
  handle: unknown
  method?: string
}

interface ExpressRoute {
  path: string
  stack: ExpressRouteLayer[]
}

interface ExpressLayer {
  route?: ExpressRoute
}

interface ExpressAppWithRouter {
  _router?: { stack: ExpressLayer[] }
}

/**
 * Find every (path, method) pair that is actually wired through `isAuthorizedHandler` — ie. a
 * real, registered business route — but has no matching permissions entry. Comparing two
 * hand-maintained lists (the old approach) can't catch a route registered with a literal string,
 * a method missing an entry, or drift between the two lists; reading the real router stack
 * checks intent against reality.
 */
export function findRoutesMissingPermissions(
  app: ExpressAppWithRouter,
  permissionsMap: PermissionsMap,
  isAuthorizedHandler: unknown
): string[] {
  const stack = app._router?.stack ?? []
  const offenders: string[] = []

  for (const layer of stack) {
    const route = layer.route
    if (!route) continue

    const isProtectedRoute = route.stack.some(
      (routeLayer) => routeLayer.handle === isAuthorizedHandler
    )
    if (!isProtectedRoute) continue

    const methods = new Set(
      route.stack.map((routeLayer) => routeLayer.method?.toUpperCase()).filter(Boolean)
    )

    for (const method of methods) {
      const entry = permissionsMap.get(route.path as Route)
      const hasMethodPermission =
        entry !== undefined &&
        Object.prototype.hasOwnProperty.call(entry.permissions, method as string)

      if (!hasMethodPermission) {
        offenders.push(`${method} ${route.path}`)
      }
    }
  }

  return offenders
}

/**
 * Fail app startup loudly, naming the specific offending (path, method) pairs, if any route
 * wired through isAuthorized has no matching permissions entry. Call this AFTER all routes are
 * registered (routes(app), adminRoutes(app), ...).
 */
export function assertAllRoutesHavePermissions(
  app: ExpressAppWithRouter,
  permissionsMap: PermissionsMap,
  isAuthorizedHandler: unknown
): void {
  const offenders = findRoutesMissingPermissions(app, permissionsMap, isAuthorizedHandler)

  if (offenders.length > 0) {
    throw new Error(
      `Routes registered without a matching permissions entry: ${offenders.join(', ')}`
    )
  }
}
