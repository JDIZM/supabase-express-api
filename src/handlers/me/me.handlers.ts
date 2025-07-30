import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { eq, and } from "drizzle-orm";
import { accounts, workspaces, profiles, workspaceMemberships } from "@/schema.ts";
import { asyncHandler } from "@/helpers/request.ts";
import { HttpErrors, handleHttpError } from "@/helpers/HttpError.ts";

/**
 * GET /me - Returns everything the frontend needs after login:
 * - Account details (email, name, etc.)
 * - All workspaces user belongs to
 * - Full profile info for each workspace
 * - Membership role for each workspace
 *
 * This replaces the need for frontend to call /workspaces separately
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { accountId } = req;

  if (!accountId) {
    handleHttpError(HttpErrors.MissingParameter("Account ID"), res, gatewayResponse);
    return;
  }

  logger.info({ msg: `Fetching complete user profile: ${accountId}` });

  // Get account details
  const [account] = await db
    .select({
      uuid: accounts.uuid,
      fullName: accounts.fullName,
      email: accounts.email,
      phone: accounts.phone,
      isSuperAdmin: accounts.isSuperAdmin,
      status: accounts.status,
      createdAt: accounts.createdAt
    })
    .from(accounts)
    .where(eq(accounts.uuid, accountId))
    .limit(1);

  if (!account) {
    handleHttpError(HttpErrors.AccountNotFound(), res, gatewayResponse);
    return;
  }

  // Get all workspaces where user is a member with complete info
  const userWorkspaces = await db
    .select({
      workspace: {
        uuid: workspaces.uuid,
        name: workspaces.name,
        description: workspaces.description,
        createdAt: workspaces.createdAt,
        ownerId: workspaces.accountId
      },
      profile: {
        uuid: profiles.uuid,
        name: profiles.name,
        createdAt: profiles.createdAt
      },
      membership: {
        uuid: workspaceMemberships.uuid,
        role: workspaceMemberships.role
      }
    })
    .from(workspaceMemberships)
    .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.uuid))
    .innerJoin(profiles, and(eq(profiles.workspaceId, workspaces.uuid), eq(profiles.accountId, accountId)))
    .where(eq(workspaceMemberships.accountId, accountId));

  const response = gatewayResponse().success(
    200,
    {
      account,
      workspaces: userWorkspaces,
      workspaceCount: userWorkspaces.length
    },
    "Current user profile retrieved"
  );

  res.status(response.code).send(response);
});
