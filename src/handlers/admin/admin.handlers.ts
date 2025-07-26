import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { eq, sql, and } from "drizzle-orm";
import { accounts, workspaces, workspaceMemberships } from "@/schema.ts";
import { asyncHandler } from "@/helpers/request.ts";
// Removed workspace control imports - SuperAdmins monitor only

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
      status: accounts.status,
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
 * PUT /admin/accounts/:id/status
 * Update account status - activate/deactivate/suspend (SuperAdmin only)
 */
export const updateAccountStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const accountId = req.params.id;

  if (!accountId) {
    throw new Error("Account ID is required");
  }

  const { status } = req.body;
  const validStatuses = ["active", "inactive", "suspended"];

  if (!status || !validStatuses.includes(status)) {
    throw new Error(`Status must be one of: ${validStatuses.join(", ")}`);
  }

  logger.info({ msg: `SuperAdmin updating account ${accountId} status to: ${status}` });

  // Update account status
  const [updatedAccount] = await db.update(accounts).set({ status }).where(eq(accounts.uuid, accountId)).returning();

  if (!updatedAccount) {
    throw new Error("Account not found");
  }

  const response = gatewayResponse().success(200, { account: updatedAccount }, `Account status updated to: ${status}`);

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

// SuperAdmin workspace control handlers removed - users manage their own workspaces

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
