import { HttpErrors, handleHttpError } from "@/helpers/HttpError.ts";
import { gatewayResponse, logger } from "@/helpers/index.ts";
import { asyncHandler } from "@/helpers/request.ts";
import { accounts, profileInsertSchema, profiles, uuidSchema, workspaceMemberships, workspaces } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { and, eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { createMembership } from "../memberships/memberships.methods.ts";
import { createDbProfile } from "../profiles/profiles.methods.ts";
import { createDbWorkspace } from "./workspaces.methods.ts";

/**
 * Creates a new workspace for the current account and
 * creates a workspace membership for the account with an admin role.
 */
export const createWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, description, profileName } = req.body;
  const { accountId } = req;

  if (!accountId) {
    handleHttpError(HttpErrors.MissingParameter("Account ID"), res, gatewayResponse);
    return;
  }

  logger.info({ msg: `Creating workspace ${name} for ${accountId}` });

  // Get account info first (outside transaction)
  const [account] = await db.select().from(accounts).where(eq(accounts.uuid, accountId)).execute();

  if (!account) {
    handleHttpError(HttpErrors.AccountNotFound(), res, gatewayResponse);
    return;
  }

  // Create workspace, membership, and profile in a transaction
  const result = await db.transaction(async (tx) => {
    const workspace = await createDbWorkspace({ name, accountId, description }, tx);
    const membership = await createMembership(workspace.uuid, accountId, "admin", tx);
    const profile = await createDbProfile(
      {
        name: profileName || account.fullName || "Workspace Owner",
        accountId,
        workspaceId: workspace.uuid
      },
      tx
    );

    return { workspace, membership, profile };
  });

  const response = gatewayResponse().success(
    200,
    {
      workspace: result.workspace,
      profile: result.profile,
      membership: result.membership
    },
    "Created workspace"
  );
  res.status(response.code).send(response);
});

export const fetchWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validationResult = uuidSchema.safeParse(req.params.id);
  if (!validationResult.success) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Invalid workspace ID: ${validationResult.error.message}`),
      res,
      gatewayResponse
    );
    return;
  }

  logger.info({ msg: `Fetching workspace: ${req.params.id}` });

  if (!req.params.id) {
    handleHttpError(HttpErrors.MissingParameter("Workspace ID"), res, gatewayResponse);
    return;
  }

  const equals = eq(workspaces.uuid, req.params.id);

  // Get workspace with members using efficient relational query
  const relations = await db.query.workspaces.findFirst({
    where: equals,
    with: {
      memberships: {
        with: {
          account: {
            columns: {
              uuid: true,
              fullName: true,
              email: true
            }
          }
        }
      },
      profiles: {
        columns: {
          uuid: true,
          name: true,
          createdAt: true,
          accountId: true
        }
      }
    }
  });

  if (!relations) {
    handleHttpError(HttpErrors.WorkspaceNotFound(), res, gatewayResponse);
    return;
  }

  // Combine membership and profile data for complete member information
  const members = relations.memberships.map((membership) => {
    const profile = relations.profiles.find((p) => p.accountId === membership.accountId);
    return {
      membership: {
        uuid: membership.uuid,
        role: membership.role
      },
      profile: profile
        ? {
            uuid: profile.uuid,
            name: profile.name,
            createdAt: profile.createdAt
          }
        : null,
      account: membership.account
    };
  });

  const workspaceWithMembers = {
    uuid: relations.uuid,
    name: relations.name,
    description: relations.description,
    createdAt: relations.createdAt,
    accountId: relations.accountId,
    members,
    memberCount: members.length
  };

  const response = gatewayResponse().success(200, workspaceWithMembers, "Fetched workspace");

  res.status(response.code).send(response);
});

export const fetchWorkspaces = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const result = await db.select().from(workspaces).execute();

  logger.info({ msg: `Fetching workspaces: ${result.length}` });

  const response = gatewayResponse().success(200, result, "Fetched workspaces");

  res.status(response.code).send(response);
});

export const fetchWorkspacesByAccountId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { accountId } = req;

  if (!accountId) {
    handleHttpError(HttpErrors.MissingParameter("Account ID"), res, gatewayResponse);
    return;
  }

  logger.info({ msg: `Fetching workspaces for account: ${accountId}` });

  const equals = eq(workspaces.accountId, accountId);
  const result = await db.select().from(workspaces).where(equals).execute();

  if (result.length === 0) {
    handleHttpError(HttpErrors.NotFound("Workspaces"), res, gatewayResponse);
    return;
  }

  const response = gatewayResponse().success(200, result, `Fetched workspaces: ${result.length}`);

  res.status(response.code).send(response);
});

export async function updateWorkspace(_req: Request, res: Response): Promise<void> {
  res.status(200).send("updateWorkspace");
}

/**
 * PATCH /workspaces/:id/profile
 * Update current user's profile in the workspace
 * Requires: User role in the workspace (can only update own profile)
 * Security: Users can ONLY update their own profile, verified by accountId match
 */
export const updateWorkspaceProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspaceId = req.params.id;
  const { accountId } = req;
  const { name } = req.body;

  if (!workspaceId) {
    handleHttpError(HttpErrors.MissingParameter("Workspace ID"), res, gatewayResponse);
    return;
  }

  // Validate accountId exists and is a valid UUID
  if (!accountId) {
    handleHttpError(HttpErrors.Unauthorized("Account ID is required"), res, gatewayResponse);
    return;
  }

  const accountValidation = uuidSchema.safeParse({ uuid: accountId });
  if (!accountValidation.success) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Invalid account ID: ${accountValidation.error.message}`),
      res,
      gatewayResponse
    );
    return;
  }

  const workspaceValidation = uuidSchema.safeParse({ uuid: workspaceId });
  if (!workspaceValidation.success) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Invalid workspace ID: ${workspaceValidation.error.message}`),
      res,
      gatewayResponse
    );
    return;
  }

  // Validate the entire request body with Zod schema
  const bodyValidation = profileInsertSchema.pick({ name: true }).safeParse({ name });
  if (!bodyValidation.success) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Profile name validation failed: ${bodyValidation.error.message}`),
      res,
      gatewayResponse
    );
    return;
  }

  const validatedName = bodyValidation.data.name.trim();

  logger.info({ msg: `Updating profile for account ${accountId} in workspace: ${workspaceId}` });

  // Security check: Find the user's OWN profile in this workspace
  // This ensures users can only update their own profile, not others
  const [existingProfile] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.accountId, accountId), eq(profiles.workspaceId, workspaceId)))
    .limit(1);

  if (!existingProfile) {
    handleHttpError(HttpErrors.NotFound("Your profile was not found in this workspace"), res, gatewayResponse);
    return;
  }

  // Update the profile - only the user's own profile can be updated
  const [updatedProfile] = await db
    .update(profiles)
    .set({ name: validatedName })
    .where(and(eq(profiles.uuid, existingProfile.uuid), eq(profiles.accountId, accountId)))
    .returning();

  if (!updatedProfile) {
    handleHttpError(HttpErrors.DatabaseError("Failed to update profile"), res, gatewayResponse);
    return;
  }

  const response = gatewayResponse().success(200, { profile: updatedProfile }, "Profile updated successfully");

  res.status(response.code).send(response);
});

export async function inviteMembers(_req: Request, res: Response): Promise<void> {
  // TODO have to be existing users; it's just adding a user with a role.
  // TODO check the person making the request has the correct permissions to add users and set roles.
  res.status(200).send("inviteMembers");
}

/**
 * DELETE /workspaces/:id
 * Delete a workspace (admin only)
 * Requires: Admin role in the workspace
 */
export const deleteWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspaceId = req.params.id;

  if (!workspaceId) {
    handleHttpError(HttpErrors.MissingParameter("Workspace ID"), res, gatewayResponse);
    return;
  }

  const validationResult = uuidSchema.safeParse({ uuid: workspaceId });
  if (!validationResult.success) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Invalid workspace ID: ${validationResult.error.message}`),
      res,
      gatewayResponse
    );
    return;
  }

  logger.info({ msg: `Deleting workspace: ${workspaceId}` });

  // Get workspace info
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.uuid, workspaceId)).limit(1);

  if (!workspace) {
    handleHttpError(HttpErrors.WorkspaceNotFound(), res, gatewayResponse);
    return;
  }

  // Delete workspace and all related data in transaction
  await db.transaction(async (tx) => {
    // Delete all profiles in the workspace
    await tx.delete(profiles).where(eq(profiles.workspaceId, workspaceId));

    // Delete all memberships
    await tx.delete(workspaceMemberships).where(eq(workspaceMemberships.workspaceId, workspaceId));

    // Delete the workspace
    await tx.delete(workspaces).where(eq(workspaces.uuid, workspaceId));
  });

  const response = gatewayResponse().success(
    200,
    { deletedWorkspaceId: workspaceId, workspaceName: workspace.name },
    `Workspace "${workspace.name}" deleted successfully`
  );

  res.status(response.code).send(response);
});
