import type { Request, Response } from "express";
import { gatewayResponse, logger } from "@/helpers/index.ts";
import { createMembership, checkMembership, isValidRole } from "./memberships.methods.ts";
import { asyncHandler } from "@/helpers/request.ts";
import { db } from "@/services/db/drizzle.ts";
import { eq, and } from "drizzle-orm";
import { accounts, profiles, workspaceMemberships, uuidSchema } from "@/schema.ts";
import { createDbProfile } from "@/handlers/profiles/profiles.methods.ts";
import { HttpErrors, handleHttpError } from "@/helpers/HttpError.ts";
import { MemberCreateSchema, MemberRoleUpdateSchema } from "@/docs/openapi-schemas.ts";

export const createMembershipHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { workspaceId, accountId, role } = req.body;

  logger.info({ msg: `Creating membership for ${accountId} in ${workspaceId} as ${role}` });

  const membership = await createMembership(workspaceId, accountId, role);

  const response = gatewayResponse().success(200, membership, "Membership created");

  res.status(response.code).send(response);
});

/**
 * GET /workspaces/:id/members
 * Get all members of a workspace
 * Requires: User or Admin role in the workspace
 */
export const getWorkspaceMembers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspaceId = req.params.id;

  if (!workspaceId) {
    handleHttpError(HttpErrors.MissingParameter("Workspace ID"), res, gatewayResponse);
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

  logger.info({ msg: `Fetching members for workspace: ${workspaceId}` });

  // Get all members with their roles and account info
  const members = await db
    .select({
      membership: {
        uuid: workspaceMemberships.uuid,
        role: workspaceMemberships.role
      },
      profile: {
        uuid: profiles.uuid,
        name: profiles.name,
        createdAt: profiles.createdAt
      },
      account: {
        uuid: accounts.uuid,
        fullName: accounts.fullName,
        email: accounts.email
      }
    })
    .from(workspaceMemberships)
    .innerJoin(accounts, eq(workspaceMemberships.accountId, accounts.uuid))
    .innerJoin(
      profiles,
      and(
        eq(workspaceMemberships.accountId, profiles.accountId),
        eq(workspaceMemberships.workspaceId, profiles.workspaceId)
      )
    )
    .where(eq(workspaceMemberships.workspaceId, workspaceId));

  const response = gatewayResponse().success(
    200,
    {
      members,
      memberCount: members.length
    },
    "Workspace members retrieved successfully"
  );

  res.status(response.code).send(response);
});

/**
 * POST /workspaces/:id/members
 * Add a member to workspace (must be existing account)
 * Requires: Admin role in the workspace
 * Body: { email: string, role: "admin" | "user", profileName?: string }
 */
export const addWorkspaceMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspaceId = req.params.id;

  const validation = MemberCreateSchema.safeParse(req.body);
  if (!validation.success) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Invalid request data: ${validation.error.message}`),
      res,
      gatewayResponse
    );
    return;
  }

  const { email, role, profileName } = validation.data;

  if (!workspaceId) {
    handleHttpError(HttpErrors.MissingParameter("Workspace ID"), res, gatewayResponse);
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

  if (!email || !role) {
    handleHttpError(HttpErrors.ValidationFailed("Email and role are required"), res, gatewayResponse);
    return;
  }

  if (!isValidRole(role)) {
    handleHttpError(HttpErrors.ValidationFailed("Invalid role. Must be 'admin' or 'user'"), res, gatewayResponse);
    return;
  }

  logger.info({ msg: `Adding member ${email} to workspace: ${workspaceId} with role: ${role}` });

  const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);

  if (!account) {
    handleHttpError(HttpErrors.NotFound("Account"), res, gatewayResponse);
    return;
  }

  const [isMember] = await checkMembership(account.uuid, workspaceId);

  if (isMember) {
    handleHttpError(HttpErrors.Conflict("User is already a member of this workspace"), res, gatewayResponse);
    return;
  }
  logger.info({
    msg: `User ${account.uuid} is not a member of workspace ${workspaceId}, 
    proceeding to create membership and add profile`
  });

  // Create membership and profile in a transaction
  const result = await db.transaction(async (tx) => {
    const membership = await createMembership(workspaceId, account.uuid, role, tx);
    const profile = await createDbProfile(
      {
        name: profileName || account.fullName || "New Member",
        accountId: account.uuid,
        workspaceId: workspaceId
      },
      tx
    );

    return { membership, profile };
  });

  const response = gatewayResponse().success(
    201,
    {
      membership: result.membership,
      profile: result.profile,
      account: {
        uuid: account.uuid,
        fullName: account.fullName,
        email: account.email
      }
    },
    `Added ${email} to workspace as ${role}`
  );

  res.status(response.code).send(response);
});

/**
 * PUT /workspaces/:id/members/:memberId/role
 * Update a member's role in the workspace
 * Requires: Admin role in the workspace
 * Body: { role: "admin" | "user" }
 */
export const updateMemberRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspaceId = req.params.id;
  const memberId = req.params.memberId;

  const validation = MemberRoleUpdateSchema.safeParse(req.body);
  if (!validation.success) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Invalid request data: ${validation.error.message}`),
      res,
      gatewayResponse
    );
    return;
  }

  const { role } = validation.data;

  if (!workspaceId || !memberId) {
    handleHttpError(HttpErrors.ValidationFailed("Workspace ID and Member ID are required"), res, gatewayResponse);
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

  const memberValidation = uuidSchema.safeParse({ uuid: memberId });
  if (!memberValidation.success) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Invalid member ID: ${memberValidation.error.message}`),
      res,
      gatewayResponse
    );
    return;
  }

  if (!role || !isValidRole(role)) {
    handleHttpError(HttpErrors.ValidationFailed("Invalid role. Must be 'admin' or 'user'"), res, gatewayResponse);
    return;
  }

  logger.info({ msg: `Updating member ${memberId} role to ${role} in workspace: ${workspaceId}` });

  // Find the membership
  const [existingMembership] = await db
    .select({
      uuid: workspaceMemberships.uuid,
      accountId: workspaceMemberships.accountId,
      currentRole: workspaceMemberships.role
    })
    .from(workspaceMemberships)
    .where(and(eq(workspaceMemberships.uuid, memberId), eq(workspaceMemberships.workspaceId, workspaceId)))
    .limit(1);

  if (!existingMembership) {
    handleHttpError(HttpErrors.NotFound("Membership"), res, gatewayResponse);
    return;
  }

  // Prevent removing the last admin
  if (existingMembership.currentRole === "admin" && role === "user") {
    const adminCount = await db
      .select({ count: workspaceMemberships.uuid })
      .from(workspaceMemberships)
      .where(and(eq(workspaceMemberships.workspaceId, workspaceId), eq(workspaceMemberships.role, "admin")));

    if (adminCount.length <= 1) {
      handleHttpError(HttpErrors.BadRequest("Cannot remove the last admin from the workspace"), res, gatewayResponse);
      return;
    }
  }

  // Update the role
  const [updatedMembership] = await db
    .update(workspaceMemberships)
    .set({ role })
    .where(eq(workspaceMemberships.uuid, memberId))
    .returning();

  const response = gatewayResponse().success(200, { membership: updatedMembership }, `Updated member role to ${role}`);

  res.status(response.code).send(response);
});

/**
 * DELETE /workspaces/:id/members/:memberId
 * Remove a member from the workspace
 * Requires: Admin role in the workspace
 */
export const removeMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspaceId = req.params.id;
  const memberId = req.params.memberId;

  if (!workspaceId || !memberId) {
    handleHttpError(HttpErrors.ValidationFailed("Workspace ID and Member ID are required"), res, gatewayResponse);
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

  const memberValidation = uuidSchema.safeParse({ uuid: memberId });
  if (!memberValidation.success) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Invalid member ID: ${memberValidation.error.message}`),
      res,
      gatewayResponse
    );
    return;
  }

  logger.info({ msg: `Removing member ${memberId} from workspace: ${workspaceId}` });

  // Find the membership to remove
  const [membershipToRemove] = await db
    .select({
      uuid: workspaceMemberships.uuid,
      accountId: workspaceMemberships.accountId,
      role: workspaceMemberships.role
    })
    .from(workspaceMemberships)
    .where(and(eq(workspaceMemberships.uuid, memberId), eq(workspaceMemberships.workspaceId, workspaceId)))
    .limit(1);

  if (!membershipToRemove) {
    handleHttpError(HttpErrors.NotFound("Membership"), res, gatewayResponse);
    return;
  }

  // Prevent removing the last admin
  if (membershipToRemove.role === "admin") {
    const adminCount = await db
      .select({ count: workspaceMemberships.uuid })
      .from(workspaceMemberships)
      .where(and(eq(workspaceMemberships.workspaceId, workspaceId), eq(workspaceMemberships.role, "admin")));

    if (adminCount.length <= 1) {
      handleHttpError(HttpErrors.BadRequest("Cannot remove the last admin from the workspace"), res, gatewayResponse);
      return;
    }
  }

  // Remove the profile and membership in transaction
  await db.transaction(async (tx) => {
    // Remove profile
    await tx
      .delete(profiles)
      .where(and(eq(profiles.accountId, membershipToRemove.accountId), eq(profiles.workspaceId, workspaceId)));

    // Remove membership
    await tx.delete(workspaceMemberships).where(eq(workspaceMemberships.uuid, memberId));
  });

  const response = gatewayResponse().success(200, { removedMemberId: memberId }, "Member removed from workspace");

  res.status(response.code).send(response);
});
