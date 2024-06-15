import { logger } from "../index.ts";

export const API_ROUTES = {
  root: "/",
  login: "/login",
  signUp: "/signup",
  accounts: "/accounts",
  accountById: "/accounts/:id",
  accountsAll: "/accounts/all",
  profiles: "/profiles",
  profileById: "/profiles/:id",
  profilesAll: "/profiles/all",
  workspaces: "/workspaces",
  workspaceById: "/workspaces/:id",
  workspacesAll: "/workspaces/all"
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

export type PermissionsMap = Map<Route, ResourcePermissions>;

export const permissions: PermissionsMap = new Map();

permissions.set(API_ROUTES.root, { GET: "" });

permissions.set(API_ROUTES.login, { POST: "" });
permissions.set(API_ROUTES.signUp, { POST: "" });

permissions.set(API_ROUTES.accounts, { GET: "admin", POST: "user" });
permissions.set(API_ROUTES.accountById, { GET: "owner", POST: "owner", PUT: "owner", PATCH: "owner" });
permissions.set(API_ROUTES.accountsAll, { GET: "admin", POST: "admin" });

permissions.set(API_ROUTES.profiles, { GET: "admin", POST: "user" });
permissions.set(API_ROUTES.profileById, { GET: "owner", POST: "owner", PUT: "owner", PATCH: "owner" });
permissions.set(API_ROUTES.profilesAll, { GET: "admin", POST: "admin" });

permissions.set(API_ROUTES.workspaces, { GET: "owner", POST: "user" });
permissions.set(API_ROUTES.workspaceById, { GET: "user", POST: "owner", PUT: "owner", PATCH: "owner" });
permissions.set(API_ROUTES.workspacesAll, { GET: "admin", POST: "admin" });

/**
 * This validates that permissions are set for all routes
 * in the permissions map.
 *
 */
export const hasRoutesWithNoPermissionsSet = (routes: Routes, permissions: PermissionsMap): boolean => {
  const permissionRoutes = [...permissions.keys()];

  const hasInvalidRoute = routes.some((route) => {
    console.log("route", route);
    return !permissionRoutes.includes(route);
  });

  return hasInvalidRoute;
};

const hasInvalidRoute = hasRoutesWithNoPermissionsSet(Object.values(API_ROUTES), permissions);

if (hasInvalidRoute) {
  const errorMessage = "There are routes without permissions set.";
  logger.error(errorMessage);
  throw new Error(errorMessage);
}
