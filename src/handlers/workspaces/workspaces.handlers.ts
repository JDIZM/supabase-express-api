import { workspaces, uuidSchema, accounts } from "@/schema.ts";
import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { eq } from "drizzle-orm";
import { createDbWorkspace } from "./workspaces.methods.ts";
import { createMembership } from "../memberships/memberships.handlers.ts";
import { createDbProfile } from "../profiles/profiles.methods.ts";

/**
 * Creates a new workspace for the current account and
 * creates a workspace membership for the account with an admin role.
 */
export const createWorkspace = async (req: Request, res: Response) => {
  try {
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
      // name: null, // TODO testing error response.
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

    return res.status(response.code).send(response);
  } catch (err) {
    const response = gatewayResponse().error(400, err as Error, "Unable to create workspace");

    return res.status(response.code).send(response);
  }
};

export const fetchWorkspace = async (req: Request, res: Response) => {
  try {
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

    return res.status(response.code).send(response);
  } catch (err) {
    const response = gatewayResponse().error(500, err as Error, "Unable to fetch workspace");

    return res.status(response.code).send(response);
  }
};

// @ts-expect-error no-unused-parameter
export const fetchWorkspaces = async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(workspaces).execute();

    logger.info({ msg: `Fetching workspaces: ${result.length}` });

    const response = gatewayResponse().success(200, result, "Fetched workspaces");

    return res.status(response.code).send(response);
  } catch (err) {
    const response = gatewayResponse().error(500, err as Error, "Unable to fetch workspaces");

    return res.status(response.code).send(response);
  }
};

// @ts-expect-error no-unused-parameter
export const fetchWorkspacesByAccountId = async (req: Request, res: Response) => {
  try {
    const { id } = res.locals;

    logger.info({ msg: `Fetching workspaces for account: ${id}` });

    const equals = eq(workspaces.accountId, id);

    const result = await db.select().from(workspaces).where(equals).execute();

    logger.info({ msg: `Fetched workspaces: ${result.length}` });

    const response = gatewayResponse().success(200, result, "Fetched workspaces");

    return res.status(response.code).send(response);
  } catch (err) {
    const response = gatewayResponse().error(500, err as Error, "Unable to fetch workspaces");

    return res.status(response.code).send(response);
  }
};

// @ts-expect-error no-unused-parameter
export async function updateWorkspace(req: Request, res: Response) {
  return res.status(200).send("updateWorkspace");
}

// TODO invite members to workspace handler.
// @ts-expect-error no-unused-parameter
export async function inviteMembers(req: Request, res: Response) {
  return res.status(200).send("inviteMembers");
}
