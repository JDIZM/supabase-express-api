import type { Request, Response } from "express";
import { workspaceMemberships } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import type { Role } from "@/helpers/permissions/permissions.ts";

export async function createMembership(workspaceId: string, accountId: string, role: Role) {
  if (role !== "admin" || role !== "user") {
    throw new Error("Invalid role");
  }

  const membership = await db
    .insert(workspaceMemberships)
    .values({
      role,
      workspaceId,
      accountId
    })
    .returning();

  console.log("created membership: ", membership);

  return membership[0];
}

/**
 * Check if the user is a member of the workspace.
 */
export async function checkMembership(accountId: string, workspaceId: string): Promise<[boolean, string]> {
  console.log("checkMembership", accountId, workspaceId);

  if (!accountId || !workspaceId) {
    return [false, ""];
  }

  const [result] = await db
    .select()
    .from(workspaceMemberships)
    .where(and(eq(workspaceMemberships.accountId, accountId), eq(workspaceMemberships.workspaceId, workspaceId)))
    .execute();

  const isMember = (result?.accountId === accountId && result?.workspaceId === workspaceId) || false;

  return [isMember, result?.role ?? ""];
}

export async function createMembershipHandler(req: Request, res: Response) {
  try {
    const { workspaceId, accountId, role } = req.body;

    const membership = await createMembership(workspaceId, accountId, role);

    return res.status(200).send(membership);
  } catch (err) {
    return res.status(500).send(err);
  }
}
