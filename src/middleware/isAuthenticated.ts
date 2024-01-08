import { Route, permissions } from "@/helpers/permissions.ts";
import { NextFunction, Request, Response } from "express";

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
  console.log("ip address:", ips);

  if (!routePermissions?.length) {
    return next();
  }

  if (!token) {
    return res.status(401).send("A token is required for authentication");
  }

  try {
    // TODO Verify token using your auth service. eg Firebase.
    // const verified = await getAuth(app).verifyIdToken(token, true);

    // TODO get user from DB.
    // const user = await getUserBySub(verified.sub);

    // TODO Attach user to res.locals and verify permissions in isAuthorized middleware
    // res.locals = { id: user?.id, sub: verified.sub, claims: verified.claims };

    // TODO Remove this example res.locals
    // Example res.locals with user info to test isAuthorized middleware
    res.locals = {
      id: "407e4af9-208b-4af7-8b17-dac60f3ebb30",
      sub: "00000000-0000-0000-0000-000000000000",
      claims: ["user"]
    };
    return next();
  } catch (error) {
    return res.status(401).send(error);
  }
};
