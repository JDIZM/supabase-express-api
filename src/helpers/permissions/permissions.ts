import { logger } from "../index.ts";

export const API_ROUTES = {
  root: "/",
  login: "/login",
  signUp: "/signup",
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

export const roles = ["admin", "user", "owner"] as const;

export type Role = (typeof roles)[number] | "";

export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type Claims = [Role, Method];

export type ResourcePermissions = {
  [Method: string]: Role;
};

export type ResourceMetadata = {
  authenticated: boolean;
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

permissions.set(API_ROUTES.accounts, {
  permissions: { GET: "", POST: "" },
  authenticated: true,
  super: true
});

permissions.set(API_ROUTES.accountById, {
  permissions: { GET: "owner", POST: "owner", PATCH: "owner" },
  authenticated: true
});

permissions.set(API_ROUTES.profiles, {
  permissions: { GET: "" },
  authenticated: true
});

permissions.set(API_ROUTES.profileById, {
  permissions: { GET: "owner", POST: "owner", PATCH: "owner" },
  authenticated: true
});

permissions.set(API_ROUTES.workspaces, {
  permissions: { GET: "", POST: "" },
  authenticated: true
});

permissions.set(API_ROUTES.workspaceById, {
  permissions: { GET: "user" },
  authenticated: true
});

/**
 * This validates that permissions are set for all routes
 * in the permissions map.
 *
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
  const errorMessage = "There are routes without permissions set.";

  logger.error({ msg: errorMessage });

  throw new Error(errorMessage);
}
