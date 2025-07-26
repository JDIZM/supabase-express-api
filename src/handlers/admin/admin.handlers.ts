import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { eq, sql, and } from "drizzle-orm";
import { accounts, workspaces, workspaceMemberships, profiles } from "@/schema.ts";
import { asyncHandler } from "@/helpers/request.ts";
import { createDbWorkspace } from "@/handlers/workspaces/workspaces.methods.ts";
import { createMembership } from "@/handlers/memberships/memberships.methods.ts";
import { createDbProfile } from "@/handlers/profiles/profiles.methods.ts";

/**
 * GET /admin/accounts
 * List all accounts with pagination (SuperAdmin only)
 */
export const listAllAccounts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  logger.info({ msg: `SuperAdmin listing all accounts - page: ${page}, limit: ${limit}` });

  // Get total count
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(accounts);
  const count = countResult?.count || 0;

  // Get paginated accounts
  const accountsList = await db
    .select({
      uuid: accounts.uuid,
      fullName: accounts.fullName,
      email: accounts.email,
      phone: accounts.phone,
      isSuperAdmin: accounts.isSuperAdmin,
      createdAt: accounts.createdAt
    })
    .from(accounts)
    .orderBy(accounts.createdAt)
    .limit(limit)
    .offset(offset);

  const response = gatewayResponse().success(
    200,
    {
      accounts: accountsList,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    },
    "Accounts retrieved successfully"
  );

  res.status(response.code).send(response);
});

/**
 * POST /admin/accounts
 * Create account for any user (SuperAdmin only)
 */
export const createAccountForUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, fullName, phone, isSuperAdmin } = req.body;

  logger.info({ msg: `SuperAdmin creating account for ${email}` });

  // Check if account already exists
  const [existingAccount] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);

  if (existingAccount) {
    throw new Error(`Account with email ${email} already exists`);
  }

  // Create account
  const [newAccount] = await db
    .insert(accounts)
    .values({
      email,
      fullName,
      phone,
      isSuperAdmin: isSuperAdmin || false
    })
    .returning();

  const response = gatewayResponse().success(201, { account: newAccount }, "Account created successfully");

  res.status(response.code).send(response);
});

/**
 * PUT /admin/accounts/:id/role
 * Promote/demote admin status (SuperAdmin only)
 */
export const updateAccountRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const accountId = req.params.id;

  if (!accountId) {
    throw new Error("Account ID is required");
  }
  const { isSuperAdmin } = req.body;

  if (typeof isSuperAdmin !== "boolean") {
    throw new Error("isSuperAdmin must be a boolean value");
  }

  logger.info({ msg: `SuperAdmin updating account ${accountId} role to isSuperAdmin: ${isSuperAdmin}` });

  // Update account
  const [updatedAccount] = await db
    .update(accounts)
    .set({ isSuperAdmin })
    .where(eq(accounts.uuid, accountId))
    .returning();

  if (!updatedAccount) {
    throw new Error("Account not found");
  }

  const response = gatewayResponse().success(
    200,
    { account: updatedAccount },
    `Account role updated to SuperAdmin: ${isSuperAdmin}`
  );

  res.status(response.code).send(response);
});

/**
 * GET /admin/workspaces
 * List ALL workspaces across all accounts (SuperAdmin only)
 */
export const listAllWorkspaces = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  logger.info({ msg: `SuperAdmin listing all workspaces - page: ${page}, limit: ${limit}` });

  // Get total count
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(workspaces);
  const count = countResult?.count || 0;

  // Get paginated workspaces with owner info and member counts
  const workspacesList = await db
    .select({
      workspace: {
        uuid: workspaces.uuid,
        name: workspaces.name,
        description: workspaces.description,
        createdAt: workspaces.createdAt,
        accountId: workspaces.accountId
      },
      owner: {
        uuid: accounts.uuid,
        fullName: accounts.fullName,
        email: accounts.email
      },
      memberCount: sql<number>`(
        SELECT COUNT(*) 
        FROM workspace_memberships 
        WHERE workspace_memberships.workspace_id = ${workspaces.uuid}
      )`
    })
    .from(workspaces)
    .innerJoin(accounts, eq(workspaces.accountId, accounts.uuid))
    .orderBy(workspaces.createdAt)
    .limit(limit)
    .offset(offset);

  const response = gatewayResponse().success(
    200,
    {
      workspaces: workspacesList,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    },
    "Workspaces retrieved successfully"
  );

  res.status(response.code).send(response);
});

/**
 * POST /admin/workspaces
 * Create workspace for any account (SuperAdmin only)
 */
export const createWorkspaceForAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { accountId, name, description } = req.body;

  logger.info({ msg: `SuperAdmin creating workspace ${name} for account ${accountId}` });

  // Check if target account exists
  const [targetAccount] = await db.select().from(accounts).where(eq(accounts.uuid, accountId)).limit(1);

  if (!targetAccount) {
    throw new Error("Target account not found");
  }

  // Create workspace
  const workspace = await createDbWorkspace({
    name,
    description,
    accountId
  });

  // Create admin membership for target account
  const membership = await createMembership(workspace.uuid, accountId, "admin");

  // Create profile for target account
  const profile = await createDbProfile({
    name: targetAccount.fullName,
    accountId,
    workspaceId: workspace.uuid
  });

  const response = gatewayResponse().success(
    201,
    { workspace, membership, profile },
    "Workspace created successfully by SuperAdmin"
  );

  res.status(response.code).send(response);
});

/**
 * DELETE /admin/workspaces/:id
 * Delete any workspace (SuperAdmin only)
 */
export const deleteAnyWorkspace = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspaceId = req.params.id;

  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  logger.info({ msg: `SuperAdmin deleting workspace ${workspaceId}` });

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
    `Workspace "${workspace.name}" deleted by SuperAdmin`
  );

  res.status(response.code).send(response);
});

/**
 * GET /admin/memberships
 * List all memberships with filtering (SuperAdmin only)
 */
export const listAllMemberships = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const workspaceId = req.query.workspaceId as string;
  const accountId = req.query.accountId as string;

  logger.info({ msg: `SuperAdmin listing memberships - filters: workspace=${workspaceId}, account=${accountId}` });

  // Build conditions for filtering
  const conditions = [];
  if (workspaceId) {
    conditions.push(eq(workspaceMemberships.workspaceId, workspaceId));
  }
  if (accountId) {
    conditions.push(eq(workspaceMemberships.accountId, accountId));
  }

  // Build base query
  const baseQuery = db
    .select({
      membership: {
        uuid: workspaceMemberships.uuid,
        role: workspaceMemberships.role,
        workspaceId: workspaceMemberships.workspaceId,
        accountId: workspaceMemberships.accountId
      },
      workspace: {
        uuid: workspaces.uuid,
        name: workspaces.name
      },
      account: {
        uuid: accounts.uuid,
        fullName: accounts.fullName,
        email: accounts.email
      }
    })
    .from(workspaceMemberships)
    .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.uuid))
    .innerJoin(accounts, eq(workspaceMemberships.accountId, accounts.uuid));

  // Apply filters if any exist
  const query =
    conditions.length > 0 ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions)) : baseQuery;

  const membershipsList = await query.limit(limit).offset(offset);

  const response = gatewayResponse().success(
    200,
    {
      memberships: membershipsList,
      pagination: {
        page,
        limit,
        total: membershipsList.length
      }
    },
    "Memberships retrieved successfully"
  );

  res.status(response.code).send(response);
});
