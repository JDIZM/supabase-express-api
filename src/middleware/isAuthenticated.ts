import { logger, gatewayResponse, permissions } from "@/helpers/index.ts";
import type { Route } from "@/helpers/index.ts";
import type { NextFunction, Request, Response } from "express";
import type { Method } from "@/helpers/permissions/permissions.ts";
import { verifyToken } from "@/handlers/auth/auth.methods.ts";

const getIpFromRequest = (req: Request): string | undefined => {
  const ips =
    req.headers["cf-connecting-ip"] ?? req.headers["x-real-ip"] ?? req.headers["x-forwarded-for"] ?? req.ip ?? "";

  const res = ips instanceof Array ? ips : ips.split(",");
  const result = res[0]?.trim();
  return result;
};

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  const routeKey = (req.baseUrl + req.route.path) as Route;

  const routeMethod = req.method as Method;

  const resourcePermissions = permissions.permissions.get(routeKey);
  const requiresAuth = (resourcePermissions && resourcePermissions.authenticated) || false;

  const ips = getIpFromRequest(req);

  logger.debug({ msg: "isAuthenticated middleware", ips, routeKey, routeMethod, resourcePermissions, requiresAuth });

  if (!requiresAuth) {
    logger.debug({ msg: "isAuthenticated: No authentication required", routeKey });

    return next();
  }

  if (!token) {
    logger.error({ msg: "isAuthenticated: A token is required for authentication", routeKey, routeMethod });

    return res.status(403).send("A token is required for authentication");
  }

  try {
    const verifiedToken = await verifyToken(token);
    console.log("verifiedToken", verifiedToken);

    if (!verifiedToken) {
      throw new Error("Invalid token");
    }

    const { sub } = verifiedToken;

    logger.debug({ msg: `Verified user token for id: ${sub}` });

    // Attach user to res.locals and verify permissions in isAuthorized middleware
    res.locals = { id: sub, sub };

    return next();
  } catch (err) {
    const response = gatewayResponse().error(401, err as Error, "Not Authorized");

    return res.status(response.code).send(response);
  }
};
