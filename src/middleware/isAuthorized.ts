import type { NextFunction, Request, Response } from "express";
import type { Route } from "@/helpers/index.ts";
import { ROLES, type Method } from "@/helpers/permissions/permissions.ts";
import { gatewayResponse, logger, permissions } from "@/helpers/index.ts";
import { checkMembership } from "@/handlers/memberships/memberships.handlers.ts";
import { getProfileById } from "@/handlers/profiles/profiles.methods.ts";
import { db } from "@/services/db/drizzle.ts";
import { accounts } from "@/schema.ts";
import { eq } from "drizzle-orm";

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
    const { id, sub } = res.locals;

    const routeMethod = req.method as Method;
    const routeKey = (req.baseUrl + req.route.path) as Route;
    const workspaceId = req.headers["x-workspace-id"];

    logger.debug({ msg: `Authorizing for workspace id: ${workspaceId}` });
    logger.debug({ msg: "isAuthorized: res.locals", locals: res.locals });

    const resourcePermissions = permissions.permissions.get(routeKey);
    const resourcePermission = resourcePermissions && resourcePermissions.permissions[routeMethod];
    const requiresAuth = (resourcePermissions && resourcePermissions.authenticated) || false;

    logger.debug({
      msg: "isAuthorized: middleware",
      routeKey,
      routeMethod,
      workspaceId,
      resourcePermissions,
      resourcePermission
    });

    if (requiresAuth && (!sub || !id)) {
      logger.error({ msg: "Unauthorized user", id, routeKey, resourcePermission, routeMethod, workspaceId });

      return res.status(401).send("Unauthorized");
    }

    // Super admin only has access to routes that have super admin permissions enabled.
    if (resourcePermissions?.super) {
      const [account] = await db.select().from(accounts).where(eq(accounts.uuid, id)).execute();

      if (!account) {
        throw new Error("DB User not found");
      }

      const { isSuperAdmin } = account;

      if (!isSuperAdmin) {
        logger.error({ msg: "isAuthorized: Not a super admin", routeKey, id, workspaceId });

        throw new Error(`Forbidden: account id: ${id} is not a super admin`);
      }

      logger.debug({
        msg: `isAuthorized: Super admin for account id: ${id}`,
        routeKey,
        workspaceId,
        isSuperAdmin
      });

      return next();
    }

    if (!resourcePermission) {
      logger.debug({ msg: "isAuthorized: No permissions required", routeKey, workspaceId });

      return next();
    }

    // An owner has access to all resources they own regardless of the workspace.
    if (resourcePermission.includes(ROLES.Owner)) {
      // Check if the user is the owner of the resource
      const resourceId = req.params?.id || "";
      const resourceType = determineResourceType(routeKey);

      // Some resources require a db call to check if the user is the owner.
      const isUserOwner = await isOwner(id, resourceId, resourceType);

      if (isUserOwner) {
        logger.debug({ msg: "isAuthorized: Owner" });
        return next();
      }

      logger.error({ msg: "isAuthorized: Not the owner of the resource", id, routeKey, workspaceId });

      throw new Error(`Forbidden: Not the owner of the resource with id: ${req.params?.id}`);
    }

    // Ensure the user is a member of the workspace and has the required role by validating the x-workspace-id header.
    if (workspaceId) {
      const [isMember, role] = await checkMembership(id, workspaceId as string);

      logger.debug({ msg: "isAuthorized: checkMembership", isMember, role });

      if (!isMember) {
        throw new Error(`Forbidden: Not a member of the workspace with id: ${workspaceId}`);
      }

      if (isMember && (resourcePermission.includes(role) || role === ROLES.Admin)) {
        return next();
      }
    }

    if (!workspaceId) {
      logger.error({
        msg: "isAuthorized: No workspace id",
        id,
        routeKey,
        resourcePermission,
        routeMethod,
        workspaceId
      });

      throw new Error("Forbidden: No workspace id");
    }

    return res.status(403).json({ message: "Forbidden" });
  } catch (err) {
    const response = gatewayResponse().error(403, err as Error, "Not Authorized");

    return res.status(response.code).json(response);
  }
};
