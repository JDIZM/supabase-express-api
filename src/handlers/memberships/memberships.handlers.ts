import type { Request, Response } from "express";
import type { Role } from "@/helpers/permissions/permissions.ts";
import { workspaceMemberships } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { gatewayResponse, logger } from "@/helpers/index.ts";
import { and, eq } from "drizzle-orm";

// Type guard function
export function isValidRole(role: string): role is "admin" | "user" {
  return ["admin", "user"].includes(role);
}

export async function createMembership(workspaceId: string, accountId: string, role: Role) {
  if (!isValidRole(role)) {
    throw new Error("Invalid role");
  }

  logger.info({ msg: `Creating membership for account: ${accountId} in workspace: ${workspaceId} as role: ${role}` });

  const [membership] = await db
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
  logger.info({ msg: `Checking membership for account: ${accountId} in workspace: ${workspaceId}` });

  if (!accountId || !workspaceId) {
    return [false, ""];
  }

  const [result] = await db
    .select()
    .from(workspaceMemberships)
    .where(and(eq(workspaceMemberships.accountId, accountId), eq(workspaceMemberships.workspaceId, workspaceId)))
    .execute();

  const isMember = (result?.accountId === accountId && result?.workspaceId === workspaceId) || false;

  logger.info({
    msg: `Checked membership for ${accountId} in ${workspaceId}. User is [${isMember}, ${result?.role ?? ""}]`
  });

  return [isMember, result?.role ?? ""];
}

export async function createMembershipHandler(req: Request, res: Response) {
  try {
    const { workspaceId, accountId, role } = req.body;

    logger.info({ msg: `Creating membership for ${accountId} in ${workspaceId} as ${role}` });

    const membership = await createMembership(workspaceId, accountId, role);

    const response = gatewayResponse().success(200, membership, "Membership created");

    return res.status(response.code).send(response);
  } catch (err) {
    const response = gatewayResponse().error(400, err as Error, "Error creating membership");

    return res.status(response.code).send(response);
  }
}
