import { workspaces, uuidSchema, accounts, profiles, workspaceMemberships } from "@/schema.ts";
import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { eq, and } from "drizzle-orm";
import { createDbWorkspace } from "./workspaces.methods.ts";
import { createMembership } from "../memberships/memberships.methods.ts";
import { createDbProfile } from "../profiles/profiles.methods.ts";
import { asyncHandler } from "@/helpers/request.ts";

/**
 * Creates a new workspace for the current account and
 * creates a workspace membership for the account with an admin role.
 */
export const createWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, description } = req.body;
  const { accountId } = req;

  if (!accountId) {
    throw new Error("Account id is required");
  }

  logger.info({ msg: `Creating workspace ${name} for ${accountId}` });

  const workspace = await createDbWorkspace({ name, accountId, description });

  const membership = await createMembership(workspace.uuid, accountId, "admin");

  const [account] = await db.select().from(accounts).where(eq(accounts.uuid, accountId)).execute();

  if (!account) {
    throw new Error("DB User not found");
  }

  const profile = await createDbProfile({
    name: account.fullName,
    accountId,
    workspaceId: workspace.uuid
  });

  const response = gatewayResponse().success(
    200,
    {
      workspace,
      profile,
      membership
    },
    "Created workspace"
  );
  res.status(response.code).send(response);
});

export const fetchWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  uuidSchema.parse({ uuid: req.params.id });

  logger.info({ msg: `Fetching workspace: ${req.params.id}` });

  if (!req.params.id) {
    throw new Error("Workspace id is required");
  }

  const equals = eq(workspaces.uuid, req.params.id);

  // Get workspace with complete member information
  const workspace = await db
    .select({
      uuid: workspaces.uuid,
      name: workspaces.name,
      description: workspaces.description,
      createdAt: workspaces.createdAt,
      accountId: workspaces.accountId
    })
    .from(workspaces)
    .where(equals)
    .limit(1);

  if (!workspace.length) {
    throw new Error("Workspace not found");
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
    .innerJoin(profiles, and(eq(profiles.workspaceId, req.params.id), eq(profiles.accountId, accounts.uuid)))
    .where(eq(workspaceMemberships.workspaceId, req.params.id));

  const relations = {
    ...workspace[0],
    members,
    memberCount: members.length
  };

  const response = gatewayResponse().success(200, relations, "Fetched workspace");

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
    throw new Error("Account id is required");
  }

  logger.info({ msg: `Fetching workspaces for account: ${accountId}` });

  const equals = eq(workspaces.accountId, accountId);
  const result = await db.select().from(workspaces).where(equals).execute();

  if (result.length === 0) {
    const response = gatewayResponse().error(400, new Error("No workspaces found"), "Unable to fetch workspaces");
    res.status(response.code).send(response);
    return;
  }

  const response = gatewayResponse().success(200, result, `Fetched workspaces: ${result.length}`);

  res.status(response.code).send(response);
});

export async function updateWorkspace(_req: Request, res: Response): Promise<void> {
  res.status(200).send("updateWorkspace");
}

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
    throw new Error("Workspace ID is required");
  }

  uuidSchema.parse({ uuid: workspaceId });

  logger.info({ msg: `Deleting workspace: ${workspaceId}` });

  // Get workspace info
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.uuid, workspaceId)).limit(1);

  if (!workspace) {
    throw new Error("Workspace not found");
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
