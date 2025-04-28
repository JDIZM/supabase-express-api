import { workspaces, uuidSchema, accounts } from "@/schema.ts";
import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { eq } from "drizzle-orm";
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
  const { id } = res.locals;

  logger.info({ msg: `Creating workspace ${name} for ${id}` });

  const workspace = await createDbWorkspace({ name, accountId: id, description });

  const membership = await createMembership(workspace.uuid, id, "admin");

  const [account] = await db.select().from(accounts).where(eq(accounts.uuid, id)).execute();

  if (!account) {
    throw new Error("DB User not found");
  }

  const profile = await createDbProfile({
    name: account.fullName,
    accountId: id,
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

  const relations = await db.query.workspaces.findFirst({
    where: equals,
    with: {
      profiles: {
        columns: {
          uuid: true,
          name: true
        }
      }
    }
  });

  const response = gatewayResponse().success(200, relations, "Fetched workspace");

  res.status(response.code).send(response);
});

export const fetchWorkspaces = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const result = await db.select().from(workspaces).execute();

  logger.info({ msg: `Fetching workspaces: ${result.length}` });

  const response = gatewayResponse().success(200, result, "Fetched workspaces");

  res.status(response.code).send(response);
});

export const fetchWorkspacesByAccountId = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const { id } = res.locals;

  logger.info({ msg: `Fetching workspaces for account: ${id}` });

  const equals = eq(workspaces.accountId, id);
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
