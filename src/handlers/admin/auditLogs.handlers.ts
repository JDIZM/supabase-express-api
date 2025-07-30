import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { eq, sql, and, desc, gte, lte } from "drizzle-orm";
import { auditLogs, accounts } from "@/schema.ts";
import { asyncHandler } from "@/helpers/request.ts";

/**
 * GET /admin/audit-logs
 * List audit logs with filtering and pagination (SuperAdmin only)
 */
export const getAuditLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  // Filter parameters
  const action = req.query.action as string;
  const entityType = req.query.entityType as string;
  const actorId = req.query.actorId as string;
  const entityId = req.query.entityId as string;
  const workspaceId = req.query.workspaceId as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  logger.info({
    msg: `SuperAdmin listing audit logs - page: ${page}, limit: ${limit}`,
    filters: { action, entityType, actorId, entityId, workspaceId, startDate, endDate }
  });

  // Build conditions for filtering
  const conditions = [];
  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }
  if (entityType) {
    conditions.push(eq(auditLogs.entityType, entityType));
  }
  if (actorId) {
    conditions.push(eq(auditLogs.actorId, actorId));
  }
  if (entityId) {
    conditions.push(eq(auditLogs.entityId, entityId));
  }
  if (workspaceId) {
    conditions.push(eq(auditLogs.workspaceId, workspaceId));
  }
  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(endDate)));
  }

  // Get total count
  const countQuery =
    conditions.length > 0
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(auditLogs)
          .where(and(...conditions))
      : db.select({ count: sql<number>`count(*)` }).from(auditLogs);

  const [countResult] = await countQuery;
  const count = countResult?.count || 0;

  // Build base query with joins for actor and target details
  const baseQuery = db
    .select({
      auditLog: {
        uuid: auditLogs.uuid,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        workspaceId: auditLogs.workspaceId,
        createdAt: auditLogs.createdAt
      },
      actor: {
        uuid: accounts.uuid,
        email: accounts.email,
        fullName: accounts.fullName
      },
      target: {
        uuid: sql<string>`target_account.uuid`,
        email: sql<string>`target_account.email`,
        fullName: sql<string>`target_account.full_name`
      },
      workspace: {
        uuid: sql<string>`workspace.uuid`,
        name: sql<string>`workspace.name`
      }
    })
    .from(auditLogs)
    .leftJoin(accounts, eq(auditLogs.actorId, accounts.uuid))
    .leftJoin(sql`accounts AS target_account`, sql`${auditLogs.targetId} = target_account.uuid`)
    .leftJoin(sql`workspaces AS workspace`, sql`${auditLogs.workspaceId} = workspace.uuid`);

  // Apply filters if any exist
  const query = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

  const auditLogsList = await query.orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);

  const response = gatewayResponse().success(
    200,
    {
      auditLogs: auditLogsList,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      },
      filters: {
        action,
        entityType,
        actorId,
        entityId,
        workspaceId,
        startDate,
        endDate
      }
    },
    "Audit logs retrieved successfully"
  );

  res.status(response.code).send(response);
});

/**
 * GET /admin/audit-logs/stats
 * Get audit log statistics (SuperAdmin only)
 */
export const getAuditLogStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const days = parseInt(req.query.days as string) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  logger.info({ msg: `SuperAdmin requesting audit log stats for last ${days} days` });

  // Get action counts
  const actionStats = await db
    .select({
      action: auditLogs.action,
      count: sql<number>`count(*)`
    })
    .from(auditLogs)
    .where(gte(auditLogs.createdAt, startDate))
    .groupBy(auditLogs.action)
    .orderBy(sql`count(*) DESC`);

  // Get entity type counts
  const entityTypeStats = await db
    .select({
      entityType: auditLogs.entityType,
      count: sql<number>`count(*)`
    })
    .from(auditLogs)
    .where(gte(auditLogs.createdAt, startDate))
    .groupBy(auditLogs.entityType)
    .orderBy(sql`count(*) DESC`);

  // Get top actors
  const topActors = await db
    .select({
      actorId: auditLogs.actorId,
      actorEmail: auditLogs.actorEmail,
      count: sql<number>`count(*)`
    })
    .from(auditLogs)
    .where(gte(auditLogs.createdAt, startDate))
    .groupBy(auditLogs.actorId, auditLogs.actorEmail)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  // Get daily activity
  const dailyActivity = await db
    .select({
      date: sql<string>`DATE(${auditLogs.createdAt})`,
      count: sql<number>`count(*)`
    })
    .from(auditLogs)
    .where(gte(auditLogs.createdAt, startDate))
    .groupBy(sql`DATE(${auditLogs.createdAt})`)
    .orderBy(sql`DATE(${auditLogs.createdAt}) DESC`);

  const response = gatewayResponse().success(
    200,
    {
      period: `${days} days`,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      actionStats,
      entityTypeStats,
      topActors,
      dailyActivity
    },
    "Audit log statistics retrieved successfully"
  );

  res.status(response.code).send(response);
});
