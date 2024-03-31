import { logger } from "@/helpers/logger.ts";

export const API_ROUTES = {
  root: "/",
  login: "/login",
  users: "/users",
  userById: "/users/:id"
} as const;

export type RouteName = keyof typeof API_ROUTES;
export type Route = (typeof API_ROUTES)[RouteName];
export type Routes = Route[];

export const roles = ["admin", "user", "owner"] as const;
export type Claim = (typeof roles)[number];

export const permissions = new Map<Route, Claim[]>();
export type PermissionsMap = Map<Route, Claim[]>;

permissions.set(API_ROUTES.root, []);
permissions.set(API_ROUTES.login, []);
permissions.set(API_ROUTES.users, ["admin"]);
permissions.set(API_ROUTES.userById, ["owner"]);

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
  logger.error(errorMessage);
  throw new Error(errorMessage);
}
