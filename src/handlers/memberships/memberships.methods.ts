import { logger } from "@/helpers/index.ts";
import type { Role } from "@/helpers/permissions.ts";
import { workspaceMemberships, type WorkspaceMembershipInsertType } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { type DbTransaction } from "@/types/database.ts";
import { and, eq } from "drizzle-orm";

// Type guard function
export function isValidRole(role: string): role is "admin" | "user" {
  return ["admin", "user"].includes(role);
}

export async function createMembership(
  workspaceId: string,
  accountId: string,
  role: Role,
  tx?: DbTransaction
): Promise<WorkspaceMembershipInsertType> {
  if (!isValidRole(role)) {
    logger.warn({ msg: `Invalid role provided: ${role}` });
    throw new Error("Invalid role");
  }

  logger.info(`Creating membership for account: ${accountId} in workspace: ${workspaceId} as role: ${role}`);

  const database = tx || db;
  const [membership] = await database
    .insert(workspaceMemberships)
    .values({
      role,
      workspaceId,
      accountId
    })
    .returning();

  if (!membership) {
    throw new Error("Unable to create membership");
  }

  logger.info({ msg: `Created membership for account: ${accountId} in workspace: ${workspaceId} as role: ${role}` });

  return membership;
}

/**
 * Check if the account is a member of the workspace.
 */
export async function checkMembership(accountId: string, workspaceId: string): Promise<[boolean, string]> {
  logger.info(`Checking membership for account: ${accountId} in workspace: ${workspaceId}`);

  if (!accountId || !workspaceId) {
    return [false, ""];
  }

  const [result] = await db
    .select()
    .from(workspaceMemberships)
    .where(and(eq(workspaceMemberships.accountId, accountId), eq(workspaceMemberships.workspaceId, workspaceId)))
    .execute();

  const isMember = (result?.accountId === accountId && result?.workspaceId === workspaceId) || false;

  logger.info(`Checked membership for ${accountId} in ${workspaceId}. User is [${isMember}, ${result?.role ?? ""}]`);

  return [isMember, result?.role ?? ""];
}
