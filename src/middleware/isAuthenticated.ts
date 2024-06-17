import { logger, gatewayResponse, permissions } from "@/helpers/index.ts";
// import { supabase } from "@/services/supabase.ts";
import { db } from "@/services/db/drizzle.ts";
import { accounts } from "@/schema.ts";
import { eq } from "drizzle-orm";
import type { Route } from "@/helpers/index.ts";
import type { NextFunction, Request, Response } from "express";
import type { Method } from "@/helpers/permissions/permissions.ts";

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

  if (!token && requiresAuth) {
    logger.error({ msg: "isAuthenticated: A token is required for authentication", routeKey, routeMethod });

    return res.status(403).send("A token is required for authentication");
  }

  try {
    // Verify token using your auth service.
    // TODO use local db user.
    // const user = { id: "5f29e851-e7a1-4cf2-8e5a-5037a85a4224" }; // admin and super admin
    const user = { id: "e2abbf9a-093b-426a-a078-09256517934d" }; // user

    // TODO - uncomment this when using supabase.
    // const {
    //   data: { user },
    //   error
    // } = await supabase.auth.getUser(token);
    //

    // if (error || !user) {
    //   throw new Error("User not found", {
    //     cause: error,
    //   });
    // }

    logger.debug({ msg: `Verified user token for id: ${user.id}` });

    // get account from DB.
    const [account] = await db.select().from(accounts).where(eq(accounts.uuid, user.id)).execute();

    if (!account) {
      throw new Error("DB User not found");
    }

    logger.debug({ msg: `Fetched account from db with id: ${account.uuid}` });

    // Attach user to res.locals and verify permissions in isAuthorized middleware
    res.locals = { id: user.id, sub: user.id, account };

    return next();
  } catch (error) {
    const response = gatewayResponse().error(403, error as Error, "isAuthenticated error");

    logger.error({ msg: "isAuthenticated error:", response });

    return res.status(response.code).send(response);
  }
};
