import { MemberCreateSchema, MemberRoleUpdateSchema } from "@/docs/openapi-schemas.ts";
import { createDbProfile } from "@/handlers/profiles/profiles.methods.ts";
import { HttpErrors, HttpStatusCode } from "@/helpers/Http.ts";
import { apiResponse } from "@/helpers/response.ts";
import { asyncHandler } from "@/helpers/request.ts";
import { accounts, profiles, uuidSchema, workspaceMemberships } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { and, eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { checkMembership, createMembership, isValidRole } from "./memberships.methods.ts";

export const createMembershipHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { workspaceId, accountId, role } = req.body;

  const membership = await createMembership(workspaceId, accountId, role);

  const response = apiResponse.success(HttpStatusCode.OK, membership, "Membership created");

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
    const response = apiResponse.error(HttpErrors.MissingParameter("Workspace ID"));
    res.status(response.code).send(response);
    return;
  }

  const workspaceValidation = uuidSchema.safeParse({ uuid: workspaceId });
  if (!workspaceValidation.success) {
    const response = apiResponse.error(
      HttpErrors.ValidationFailed(`Invalid workspace ID: ${workspaceValidation.error.message}`)
    );
    res.status(response.code).send(response);
    return;
  }

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

  const response = apiResponse.success(
    HttpStatusCode.OK,
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
    const response = apiResponse.error(
      HttpErrors.ValidationFailed(`Invalid request data: ${validation.error.message}`)
    );
    res.status(response.code).send(response);
    return;
  }

  const { email, role, profileName } = validation.data;

  if (!workspaceId) {
    const response = apiResponse.error(HttpErrors.MissingParameter("Workspace ID"));
    res.status(response.code).send(response);
    return;
  }

  const workspaceValidation = uuidSchema.safeParse({ uuid: workspaceId });
  if (!workspaceValidation.success) {
    const response = apiResponse.error(
      HttpErrors.ValidationFailed(`Invalid workspace ID: ${workspaceValidation.error.message}`)
    );
    res.status(response.code).send(response);
    return;
  }

  if (!email || !role) {
    const response = apiResponse.error(HttpErrors.ValidationFailed("Email and role are required"));
    res.status(response.code).send(response);
    return;
  }

  if (!isValidRole(role)) {
    const response = apiResponse.error(HttpErrors.ValidationFailed("Invalid role. Must be 'admin' or 'user'"));
    res.status(response.code).send(response);
    return;
  }

  const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);

  if (!account) {
    const response = apiResponse.error(HttpErrors.NotFound("Account"));
    res.status(response.code).send(response);
    return;
  }

  const [isMember] = await checkMembership(account.uuid, workspaceId);

  if (isMember) {
    const response = apiResponse.error(HttpErrors.Conflict("User is already a member of this workspace"));
    res.status(response.code).send(response);
    return;
  }

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

  const response = apiResponse.success(
    HttpStatusCode.CREATED,
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
    const response = apiResponse.error(
      HttpErrors.ValidationFailed(`Invalid request data: ${validation.error.message}`)
    );
    res.status(response.code).send(response);
    return;
  }

  const { role } = validation.data;

  if (!workspaceId || !memberId) {
    const response = apiResponse.error(HttpErrors.ValidationFailed("Workspace ID and Member ID are required"));
    res.status(response.code).send(response);
    return;
  }

  const workspaceValidation = uuidSchema.safeParse({ uuid: workspaceId });
  if (!workspaceValidation.success) {
    const response = apiResponse.error(
      HttpErrors.ValidationFailed(`Invalid workspace ID: ${workspaceValidation.error.message}`)
    );
    res.status(response.code).send(response);
    return;
  }

  const memberValidation = uuidSchema.safeParse({ uuid: memberId });
  if (!memberValidation.success) {
    const response = apiResponse.error(
      HttpErrors.ValidationFailed(`Invalid member ID: ${memberValidation.error.message}`)
    );
    res.status(response.code).send(response);
    return;
  }

  if (!role || !isValidRole(role)) {
    const response = apiResponse.error(HttpErrors.ValidationFailed("Invalid role. Must be 'admin' or 'user'"));
    res.status(response.code).send(response);
    return;
  }

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
    const response = apiResponse.error(HttpErrors.NotFound("Membership"));
    res.status(response.code).send(response);
    return;
  }

  // Prevent removing the last admin
  if (existingMembership.currentRole === "admin" && role === "user") {
    const adminCount = await db
      .select({ count: workspaceMemberships.uuid })
      .from(workspaceMemberships)
      .where(and(eq(workspaceMemberships.workspaceId, workspaceId), eq(workspaceMemberships.role, "admin")));

    if (adminCount.length <= 1) {
      const response = apiResponse.error(HttpErrors.BadRequest("Cannot remove the last admin from the workspace"));
      res.status(response.code).send(response);
      return;
    }
  }

  // Update the role
  const [updatedMembership] = await db
    .update(workspaceMemberships)
    .set({ role })
    .where(eq(workspaceMemberships.uuid, memberId))
    .returning();

  const response = apiResponse.success(
    HttpStatusCode.OK,
    { membership: updatedMembership },
    `Updated member role to ${role}`
  );

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
    const response = apiResponse.error(HttpErrors.ValidationFailed("Workspace ID and Member ID are required"));
    res.status(response.code).send(response);
    return;
  }

  const workspaceValidation = uuidSchema.safeParse({ uuid: workspaceId });
  if (!workspaceValidation.success) {
    const response = apiResponse.error(
      HttpErrors.ValidationFailed(`Invalid workspace ID: ${workspaceValidation.error.message}`)
    );
    res.status(response.code).send(response);
    return;
  }

  const memberValidation = uuidSchema.safeParse({ uuid: memberId });
  if (!memberValidation.success) {
    const response = apiResponse.error(
      HttpErrors.ValidationFailed(`Invalid member ID: ${memberValidation.error.message}`)
    );
    res.status(response.code).send(response);
    return;
  }

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
    const response = apiResponse.error(HttpErrors.NotFound("Membership"));
    res.status(response.code).send(response);
    return;
  }

  // Prevent removing the last admin
  if (membershipToRemove.role === "admin") {
    const adminCount = await db
      .select({ count: workspaceMemberships.uuid })
      .from(workspaceMemberships)
      .where(and(eq(workspaceMemberships.workspaceId, workspaceId), eq(workspaceMemberships.role, "admin")));

    if (adminCount.length <= 1) {
      const response = apiResponse.error(HttpErrors.BadRequest("Cannot remove the last admin from the workspace"));
      res.status(response.code).send(response);
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

  const response = apiResponse.success(
    HttpStatusCode.OK,
    { removedMemberId: memberId },
    "Member removed from workspace"
  );

  res.status(response.code).send(response);
});
