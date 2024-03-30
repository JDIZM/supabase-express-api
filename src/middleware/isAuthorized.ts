import { NextFunction, Request, Response } from "express";
import { Route, permissions } from "@/helpers/permissions.js";

export const isAuthorized = async (req: Request, res: Response, next: NextFunction) => {
  const { id, sub, claims } = res.locals;
  console.log("res.locals", res.locals);

  const routeKey = (req.baseUrl + req.route.path) as Route;
  const routePermissions = permissions.get(routeKey);
  const isOwner: boolean = id && (req.params?.userId === id || req.params?.id === id);

  console.log("routeKey", routeKey);
  console.log("routePermissions", routePermissions);
  console.log("isOwner", isOwner);

  // If the route doesn't have any permissions, allow access.
  if (!routePermissions?.length) {
    return next();
  }

  // If the user is not logged in, deny access.
  if (!sub || !claims || !id || !claims.length) {
    return res.status(401).send("Unauthorized");
  }

  // If the user is an admin, allow access.
  if (claims.includes("admin")) {
    return next();
  }

  // User permissions
  if (claims.includes("user")) {
    if (routePermissions.includes("user")) {
      return next();
    }

    if (routePermissions.includes("owner") && isOwner) {
      return next();
    }

    return res.status(401).send("Unauthorized");
  }
};
