import { logger } from "./logger.ts";

export const API_ROUTES = {
  root: "/",
  login: "/login",
  signUp: "/signup",
  me: "/me",
  accounts: "/accounts",
  accountById: "/accounts/:id",
  // profiles: "/profiles", // Removed - access through workspace context
  // profileById: "/profiles/:id", // Removed - access through workspace context
  workspaces: "/workspaces",
  workspaceById: "/workspaces/:id",
  workspaceMembers: "/workspaces/:id/members",
  workspaceMemberRole: "/workspaces/:id/members/:memberId/role",
  workspaceMemberRemove: "/workspaces/:id/members/:memberId",
  // Admin routes
  adminAccounts: "/admin/accounts",
  adminAccountRole: "/admin/accounts/:id/role",
  adminWorkspaces: "/admin/workspaces",
  adminWorkspaceById: "/admin/workspaces/:id",
  adminMemberships: "/admin/memberships"
} as const;

export type RouteName = keyof typeof API_ROUTES;

export type Route = (typeof API_ROUTES)[RouteName];

export type Routes = Route[];

export const ROLES = {
  Admin: "admin",
  User: "user",
  Owner: "owner"
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES] | "";

export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type Claims = [Role, Method];

export type ResourcePermissions = {
  [Method: string]: Role;
};

export type ResourceMetadata = {
  // Defines if the route requires authentication.
  // If true, the route is only accessible to authenticated users.
  authenticated: boolean;
  // A super user only route.
  // If true, the route is only accessible to super users.
  super?: boolean;
};

export type ResourceWithMeta = {
  permissions: ResourcePermissions;
} & ResourceMetadata;

export type PermissionsMap = Map<Route, ResourceWithMeta>;

export const permissions: PermissionsMap = new Map();

permissions.set(API_ROUTES.root, { permissions: {}, authenticated: false });
permissions.set(API_ROUTES.login, { permissions: {}, authenticated: false });
permissions.set(API_ROUTES.signUp, { permissions: {}, authenticated: false });

permissions.set(API_ROUTES.me, {
  permissions: { GET: "" },
  authenticated: true
});

permissions.set(API_ROUTES.accounts, {
  permissions: { GET: "", POST: "" },
  authenticated: true,
  super: true
});

permissions.set(API_ROUTES.accountById, {
  permissions: { GET: ROLES.Owner, POST: ROLES.Owner, PATCH: ROLES.Owner },
  authenticated: true
});

// Profile permissions removed - profiles accessed through workspace context

permissions.set(API_ROUTES.workspaces, {
  permissions: { GET: "", POST: "" },
  authenticated: true
});

permissions.set(API_ROUTES.workspaceById, {
  permissions: { GET: ROLES.User, DELETE: ROLES.Admin },
  authenticated: true
});

permissions.set(API_ROUTES.workspaceMembers, {
  permissions: { GET: ROLES.User, POST: ROLES.Admin },
  authenticated: true
});

permissions.set(API_ROUTES.workspaceMemberRole, {
  permissions: { PUT: ROLES.Admin },
  authenticated: true
});

permissions.set(API_ROUTES.workspaceMemberRemove, {
  permissions: { DELETE: ROLES.Admin },
  authenticated: true
});

// Admin routes - all require SuperAdmin
permissions.set(API_ROUTES.adminAccounts, {
  permissions: { GET: "", POST: "" },
  authenticated: true,
  super: true
});

permissions.set(API_ROUTES.adminAccountRole, {
  permissions: { PUT: "" },
  authenticated: true,
  super: true
});

permissions.set(API_ROUTES.adminWorkspaces, {
  permissions: { GET: "", POST: "" },
  authenticated: true,
  super: true
});

permissions.set(API_ROUTES.adminWorkspaceById, {
  permissions: { DELETE: "" },
  authenticated: true,
  super: true
});

permissions.set(API_ROUTES.adminMemberships, {
  permissions: { GET: "" },
  authenticated: true,
  super: true
});

logger.info(permissions, "route permissions set");

/**
 * This validates that permissions are set for all routes
 * in the permissions map.
 */
export const hasRoutesWithNoPermissionsSet = (routes: Routes, permissions: PermissionsMap): boolean => {
  const permissionRoutes = [...permissions.keys()];

  const hasInvalidRoute = routes.some((route) => {
    return !permissionRoutes.includes(route);
  });

  return hasInvalidRoute;
};

const hasInvalidRoute = hasRoutesWithNoPermissionsSet(Object.values(API_ROUTES), permissions);

if (hasInvalidRoute) {
  throw new Error("There are routes without permissions set.");
}
