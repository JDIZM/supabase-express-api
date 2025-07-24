import { logger } from "./logger.ts";

export const API_ROUTES = {
  root: "/",
  login: "/login",
  signUp: "/signup",
  me: "/me",
  accounts: "/accounts",
  accountById: "/accounts/:id",
  profiles: "/profiles",
  profileById: "/profiles/:id",
  workspaces: "/workspaces",
  workspaceById: "/workspaces/:id"
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

permissions.set(API_ROUTES.profiles, {
  permissions: { GET: "" },
  authenticated: true
});

permissions.set(API_ROUTES.profileById, {
  permissions: { GET: ROLES.Owner, POST: ROLES.Owner, PATCH: ROLES.Owner },
  authenticated: true
});

permissions.set(API_ROUTES.workspaces, {
  permissions: { GET: "", POST: "" },
  authenticated: true
});

permissions.set(API_ROUTES.workspaceById, {
  permissions: { GET: ROLES.User },
  authenticated: true
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
