import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { eq, sql, and } from "drizzle-orm";
import { accounts, workspaces, workspaceMemberships } from "@/schema.ts";
import { asyncHandler } from "@/helpers/request.ts";
import { createAuditLog, auditHelpers, AUDIT_ACTIONS, ENTITY_TYPES } from "@/services/auditLog.ts";
import { HttpErrors, handleHttpError } from "@/helpers/HttpError.ts";
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

  // Get paginated accounts with total count in single query
  const accountsWithCount = await db
    .select({
      uuid: accounts.uuid,
      fullName: accounts.fullName,
      email: accounts.email,
      phone: accounts.phone,
      isSuperAdmin: accounts.isSuperAdmin,
      status: accounts.status,
      createdAt: accounts.createdAt,
      totalCount: sql<number>`count(*) over()`
    })
    .from(accounts)
    .orderBy(accounts.createdAt)
    .limit(limit)
    .offset(offset);

  const count = accountsWithCount[0]?.totalCount || 0;
  // Clean data by removing totalCount from individual records
  const accountsList = accountsWithCount.map(({ totalCount: _, ...account }) => account);

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
  const { accountId } = req;

  if (!accountId) {
    handleHttpError(HttpErrors.Unauthorized(), res, gatewayResponse);
    return;
  }

  logger.info({ msg: `SuperAdmin creating account for ${email}` });

  // Check if account already exists
  const [existingAccount] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);

  if (existingAccount) {
    logger.error({ email }, `Account with email ${email} already exists`);
    handleHttpError(HttpErrors.BadRequest("Unable to create account with provided information"), res, gatewayResponse);
    return;
  }

  // Create account and audit log in transaction
  const newAccount = await db.transaction(async (tx) => {
    const [account] = await tx
      .insert(accounts)
      .values({
        email,
        fullName,
        phone,
        isSuperAdmin: isSuperAdmin || false
      })
      .returning();

    if (!account) {
      throw new Error("Failed to create account");
    }

    // Audit log the account creation
    await createAuditLog(
      {
        action: AUDIT_ACTIONS.ACCOUNT_CREATED,
        entityType: ENTITY_TYPES.ACCOUNT,
        entityId: account.uuid,
        actorId: accountId,
        targetId: account.uuid,
        details: {
          email: account.email,
          fullName: account.fullName,
          isSuperAdmin: account.isSuperAdmin,
          createdBy: "admin"
        }
      },
      req,
      undefined,
      tx
    );

    return account;
  });

  if (!newAccount) {
    handleHttpError(HttpErrors.DatabaseError("Failed to create account"), res, gatewayResponse);
    return;
  }

  const response = gatewayResponse().success(201, { account: newAccount }, "Account created successfully");

  res.status(response.code).send(response);
});

/**
 * PUT /admin/accounts/:id/role
 * Promote/demote admin status (SuperAdmin only)
 */
export const updateAccountRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const targetAccountId = req.params.id;
  const { accountId } = req;

  if (!targetAccountId) {
    handleHttpError(HttpErrors.MissingParameter("Account ID"), res, gatewayResponse);
    return;
  }

  if (!accountId) {
    handleHttpError(HttpErrors.Unauthorized(), res, gatewayResponse);
    return;
  }

  const { isSuperAdmin } = req.body;

  if (typeof isSuperAdmin !== "boolean") {
    handleHttpError(HttpErrors.ValidationFailed("isSuperAdmin must be a boolean value"), res, gatewayResponse);
    return;
  }

  logger.info({ msg: `SuperAdmin updating account ${targetAccountId} role to isSuperAdmin: ${isSuperAdmin}` });

  // Get current account to track the change (outside transaction)
  const [currentAccount] = await db
    .select({ isSuperAdmin: accounts.isSuperAdmin })
    .from(accounts)
    .where(eq(accounts.uuid, targetAccountId))
    .limit(1);

  if (!currentAccount) {
    handleHttpError(HttpErrors.AccountNotFound(), res, gatewayResponse);
    return;
  }

  // Update account and audit log in transaction
  const updatedAccount = await db.transaction(async (tx) => {
    const [account] = await tx
      .update(accounts)
      .set({ isSuperAdmin })
      .where(eq(accounts.uuid, targetAccountId))
      .returning();

    if (!account) {
      throw new Error("Account not found");
    }

    // Audit log the role change
    await auditHelpers.roleChanged(
      accountId,
      targetAccountId,
      currentAccount.isSuperAdmin || false,
      isSuperAdmin,
      req,
      tx
    );

    return account;
  });

  if (!updatedAccount) {
    handleHttpError(HttpErrors.AccountNotFound(), res, gatewayResponse);
    return;
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
  const targetAccountId = req.params.id;
  const { accountId } = req;

  if (!targetAccountId) {
    handleHttpError(HttpErrors.MissingParameter("Account ID"), res, gatewayResponse);
    return;
  }

  if (!accountId) {
    handleHttpError(HttpErrors.Unauthorized(), res, gatewayResponse);
    return;
  }

  const { status } = req.body;
  const validStatuses = ["active", "inactive", "suspended"];

  if (!status || !validStatuses.includes(status)) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Status must be one of: ${validStatuses.join(", ")}`),
      res,
      gatewayResponse
    );
    return;
  }

  logger.info({ msg: `SuperAdmin updating account ${targetAccountId} status to: ${status}` });

  // Get current account to track the change (outside transaction)
  const [currentAccount] = await db
    .select({ status: accounts.status })
    .from(accounts)
    .where(eq(accounts.uuid, targetAccountId))
    .limit(1);

  if (!currentAccount) {
    handleHttpError(HttpErrors.AccountNotFound(), res, gatewayResponse);
    return;
  }

  // Update account status and audit log in transaction
  const updatedAccount = await db.transaction(async (tx) => {
    const [account] = await tx.update(accounts).set({ status }).where(eq(accounts.uuid, targetAccountId)).returning();

    if (!account) {
      throw new Error("Account not found");
    }

    // Audit log the status change
    await auditHelpers.accountStatusChanged(accountId, targetAccountId, currentAccount.status, status, req, tx);

    return account;
  });

  if (!updatedAccount) {
    handleHttpError(HttpErrors.AccountNotFound(), res, gatewayResponse);
    return;
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

  // Get paginated workspaces with owner info, member counts, and total count in single query
  const workspacesWithCount = await db
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
      )`,
      totalCount: sql<number>`count(*) over()`
    })
    .from(workspaces)
    .innerJoin(accounts, eq(workspaces.accountId, accounts.uuid))
    .orderBy(workspaces.createdAt)
    .limit(limit)
    .offset(offset);

  const count = workspacesWithCount[0]?.totalCount || 0;
  // Clean data by removing totalCount from individual records
  const workspacesList = workspacesWithCount.map(({ totalCount: _, ...workspace }) => workspace);

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

  // Get total count for pagination (using same filter conditions)
  const countQuery =
    conditions.length > 0
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(workspaceMemberships)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : db.select({ count: sql<number>`count(*)` }).from(workspaceMemberships);

  const [countResult] = await countQuery;
  const count = countResult?.count || 0;

  const response = gatewayResponse().success(
    200,
    {
      memberships: membershipsList,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    },
    "Memberships retrieved successfully"
  );

  res.status(response.code).send(response);
});
