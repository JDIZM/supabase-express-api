import type { Request, Response } from "express";
import { gatewayResponse, logger } from "@/helpers/index.ts";
import { createMembership } from "./memberships.methods.ts";

export async function createMembershipHandler(req: Request, res: Response): Promise<void> {
  const { workspaceId, accountId, role } = req.body;

  logger.info({ msg: `Creating membership for ${accountId} in ${workspaceId} as ${role}` });

  const membership = await createMembership(workspaceId, accountId, role);

  const response = gatewayResponse().success(200, membership, "Membership created");

  res.status(response.code).send(response);
}
