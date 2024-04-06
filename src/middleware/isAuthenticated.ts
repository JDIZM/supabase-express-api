import { Route, permissions } from "@/helpers/permissions.ts";
import { NextFunction, Request, Response } from "express";
import { supabase } from "@/services/supabase.ts";
import { db } from "@/services/db/drizzle.js";
import { logger } from "@/helpers/logger.ts";
import { users } from "@/schema.js";
import { eq } from "drizzle-orm";

// https://stackabuse.com/bytes/how-to-get-a-users-ip-address-in-express-js/
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

  const routeKey = req.baseUrl + req.route.path;
  const routePermissions = permissions.get(routeKey as Route);

  const ips = getIpFromRequest(req);
  logger.info("ip address:", ips);

  // parsed cookies from cookie-parser middleware
  logger.info("cookies", req.cookies);

  if (!routePermissions?.length) {
    return next();
  }

  if (!token) {
    logger.error("A token is required for authentication", 403);
    return res.status(403).send("A token is required for authentication");
  }

  try {
    // Verify token using your auth service.
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error("User not found", {
        cause: error
      });
    }

    // get user from DB.
    const [dbUser] = await db.select().from(users).where(eq(users.uuid, user.id)).execute();

    // Attach user to res.locals and verify permissions in isAuthorized middleware
    res.locals = { id: user.id, sub: user.id, claims: dbUser.role };

    // TODO Remove this example res.locals
    // Example res.locals with user info to test isAuthorized middleware
    // res.locals = {
    //   id: "f30ebcf1-ae80-4e09-b04b-39ca23856825",
    //   sub: "f30ebcf1-ae80-4e09-b04b-39ca23856825",
    //   claims: ["admin"]
    // };
    return next();
  } catch (error) {
    logger.error("isAuthenticated error:", 403, error);
    return res.status(403).send(error);
  }
};
