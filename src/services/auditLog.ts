import { db } from "@/services/db/drizzle.ts";
import { auditLogs, accounts } from "@/schema.ts";
import { logger } from "@/helpers/index.ts";
import { getIpFromRequest } from "@/helpers/request.ts";
import { eq } from "drizzle-orm";
import type { Request } from "express";

export interface AuditLogData {
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  targetId?: string;
  details?: Record<string, unknown>;
  workspaceId?: string;
}

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
  actorEmail?: string;
  targetEmail?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  data: AuditLogData,
  req?: Request,
  context?: Partial<AuditContext>
): Promise<void> {
  try {
    // Extract context from request if provided
    const ipAddress = req ? getIpFromRequest(req) : context?.ipAddress;
    const userAgent = req?.headers["user-agent"] || context?.userAgent;

    // Get actor email if not provided
    let actorEmail = context?.actorEmail;
    if (!actorEmail && data.actorId) {
      const [actor] = await db
        .select({ email: accounts.email })
        .from(accounts)
        .where(eq(accounts.uuid, data.actorId))
        .limit(1);
      actorEmail = actor?.email;
    }

    // Get target email if not provided
    let targetEmail = context?.targetEmail;
    if (!targetEmail && data.targetId) {
      const [target] = await db
        .select({ email: accounts.email })
        .from(accounts)
        .where(eq(accounts.uuid, data.targetId))
        .limit(1);
      targetEmail = target?.email;
    }

    // Create audit log entry
    await db.insert(auditLogs).values({
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      actorId: data.actorId,
      actorEmail: actorEmail || "unknown",
      targetId: data.targetId,
      targetEmail,
      details: data.details,
      ipAddress,
      userAgent,
      workspaceId: data.workspaceId
    });

    logger.info({
      msg: "Audit log created",
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      actorId: data.actorId,
      targetId: data.targetId,
      workspaceId: data.workspaceId
    });
  } catch (error) {
    logger.error({
      msg: "Failed to create audit log",
      error,
      data
    });
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

/**
 * Predefined audit actions for consistency
 */
export const AUDIT_ACTIONS = {
  // Account actions
  ACCOUNT_CREATED: "account_created",
  ACCOUNT_STATUS_UPDATED: "account_status_updated",
  ACCOUNT_ROLE_UPDATED: "account_role_updated",
  ACCOUNT_UPDATED: "account_updated",

  // Workspace actions
  WORKSPACE_CREATED: "workspace_created",
  WORKSPACE_UPDATED: "workspace_updated",
  WORKSPACE_DELETED: "workspace_deleted",

  // Membership actions
  MEMBER_ADDED: "member_added",
  MEMBER_REMOVED: "member_removed",
  MEMBER_ROLE_UPDATED: "member_role_updated",

  // Authentication actions
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
  SIGNUP_SUCCESS: "signup_success",

  // Admin actions
  ADMIN_ACCESS: "admin_access",
  BULK_OPERATION: "bulk_operation"
} as const;

/**
 * Entity types for audit logs
 */
export const ENTITY_TYPES = {
  ACCOUNT: "account",
  WORKSPACE: "workspace",
  MEMBERSHIP: "membership",
  PROFILE: "profile",
  AUDIT_LOG: "audit_log"
} as const;

/**
 * Convenience functions for common audit operations
 */
export const auditHelpers = {
  /**
   * Log account status change
   */
  accountStatusChanged: async (
    actorId: string,
    targetId: string,
    oldStatus: string,
    newStatus: string,
    req?: Request
  ): Promise<void> => {
    await createAuditLog(
      {
        action: AUDIT_ACTIONS.ACCOUNT_STATUS_UPDATED,
        entityType: ENTITY_TYPES.ACCOUNT,
        entityId: targetId,
        actorId,
        targetId,
        details: { oldStatus, newStatus }
      },
      req
    );
  },

  /**
   * Log role change
   */
  roleChanged: async (
    actorId: string,
    targetId: string,
    oldRole: boolean,
    newRole: boolean,
    req?: Request
  ): Promise<void> => {
    await createAuditLog(
      {
        action: AUDIT_ACTIONS.ACCOUNT_ROLE_UPDATED,
        entityType: ENTITY_TYPES.ACCOUNT,
        entityId: targetId,
        actorId,
        targetId,
        details: {
          oldRole: oldRole ? "SuperAdmin" : "User",
          newRole: newRole ? "SuperAdmin" : "User"
        }
      },
      req
    );
  },

  /**
   * Log workspace member role change
   */
  memberRoleChanged: async (
    actorId: string,
    targetId: string,
    workspaceId: string,
    oldRole: string,
    newRole: string,
    req?: Request
  ): Promise<void> => {
    await createAuditLog(
      {
        action: AUDIT_ACTIONS.MEMBER_ROLE_UPDATED,
        entityType: ENTITY_TYPES.MEMBERSHIP,
        entityId: `${workspaceId}-${targetId}`, // Composite identifier
        actorId,
        targetId,
        workspaceId,
        details: { oldRole, newRole }
      },
      req
    );
  }
};
