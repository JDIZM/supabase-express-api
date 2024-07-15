import type { NextFunction, Request, Response } from "express";
import type { Route } from "@/helpers/index.ts";
import type { Method } from "@/helpers/permissions/permissions.ts";
import { logger, permissions } from "@/helpers/index.ts";
import { checkMembership } from "@/handlers/memberships/memberships.handlers.ts";
import { getProfileById } from "@/handlers/profiles/profiles.methods.ts";

const ResourceType = {
  ACCOUNT: "account",
  PROFILE: "profile"
} as const;

export function determineResourceType(route: Route) {
  const keys = Object.values(ResourceType);
  const resourceType = keys.find((key) => route.includes(key));
  return resourceType ?? "";
}

/**
 * Check if the user is the owner of a resource.
 */
const isOwner = async (id: string, resourceId: string, resourceType: string): Promise<boolean> => {
  switch (resourceType) {
    case ResourceType.ACCOUNT:
      return id === resourceId;

    case ResourceType.PROFILE: {
      const [profile] = await getProfileById(resourceId);

      if (profile) {
        logger.debug({ msg: "isOwner: profile", id, resourceId, accountId: profile.accountId });

        return profile.accountId === id;
      }

      return false;
    }

    default:
      return false;
  }
};

export const isAuthorized = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, sub, account } = res.locals;

    const routeMethod = req.method as Method;
    const routeKey = (req.baseUrl + req.route.path) as Route;
    const workspaceId = req.headers["x-workspace-id"];

    logger.debug({ msg: `Authorizing for workspace id: ${workspaceId}` });
    logger.debug({ msg: "isAuthorized: res.locals", locals: res.locals });

    const resourcePermissions = permissions.permissions.get(routeKey);
    const resourcePermission = resourcePermissions && resourcePermissions.permissions[routeMethod];
    const requiresAuth = (resourcePermissions && resourcePermissions.authenticated) || false;

    const isSuperAdmin: boolean = account?.isSuperAdmin || false;

    logger.debug({
      msg: "isAuthorized: middleware",
      routeKey,
      routeMethod,
      workspaceId,
      resourcePermissions,
      resourcePermission,
      isSuperAdmin
    });

    if (requiresAuth && (!sub || !id || !account)) {
      logger.error({ msg: "Unauthorized user", id, routeKey, resourcePermission, routeMethod, workspaceId });

      return res.status(401).send("Unauthorized");
    }

    if (!routeMethod) {
      logger.error({ msg: "isAuthorized: Route method not allowed", routeKey, workspaceId });

      return res.status(405).send("Route method not allowed");
    }

    // Super admin only has access to routes that require super admin permissions.
    if (resourcePermissions?.super && isSuperAdmin) {
      logger.debug({
        msg: `isAuthorized: Super admin for account id: ${account.uuid}`,
        routeKey,
        workspaceId,
        isSuperAdmin
      });

      return next();
    } else if (resourcePermissions?.super) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!resourcePermission) {
      logger.debug({ msg: "isAuthorized: No permissions required", routeKey, workspaceId, isSuperAdmin });

      return next();
    }

    // Ensure the user is a member of the workspace and has the required role by validating the x-workspace-id header.
    const [isMember, role] = await checkMembership(id, workspaceId as string);

    logger.debug({ msg: "isAuthorized: checkMembership", isMember, role });

    if (isMember && (resourcePermission.includes(role) || resourcePermission.includes("user"))) {
      return next();
    }

    // Check if the user is the owner of the resource
    const resourceType = determineResourceType(routeKey);

    const isUserOwner = await isOwner(id, req.params?.id || "", resourceType);

    if (isUserOwner && resourcePermission.includes("owner")) {
      logger.debug({ msg: "isAuthorized: Owner" });
      return next();
    }

    return res.status(403).json({ message: "Forbidden" });
  } catch (err) {
    logger.error({ msg: "isAuthorized", err });
    return res.status(500).json({ message: "Internal server error" });
  }
};
