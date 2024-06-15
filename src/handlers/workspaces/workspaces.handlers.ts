import { workspaces, workspaceInsertSchema, uuidSchema } from "@/schema.ts";
import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { eq, type InferInsertModel } from "drizzle-orm";

export const createWorkspace = async (workspace: InferInsertModel<typeof workspaces>) => {
  const { name, accountId, description } = workspace;

  logger.debug({ msg: `Creating workspace ${name} for ${accountId}` });

  workspaceInsertSchema.parse({ name, accountId, description });

  const result = await db.insert(workspaces).values({ name, accountId, description }).returning();

  return result;
};

export const createWorkspaceHandler = async (req: Request, res: Response) => {
  try {
    const { name, accountId, description } = req.body;

    logger.info({ msg: `Creating workspace ${name} for ${accountId}` });

    uuidSchema.parse({ uuid: accountId });

    workspaceInsertSchema.parse({ name, accountId, description });

    const workspace = await db.insert(workspaces).values({ name, accountId, description }).returning();

    const response = gatewayResponse().success(200, workspace, "HELLO");

    return res.status(response.code).send(response);
  } catch (err) {
    const message = "Unable to create workspace";

    logger.error({ msg: message, err });

    const response = gatewayResponse().error(500, Error(message), message);

    return res.status(response.code).send(response);
  }
};

export const fetchWorkspaceHandler = async (req: Request, res: Response) => {
  try {
    uuidSchema.parse({ uuid: req.params.id });

    logger.info({ msg: `Fetching workspace: ${req.params.id}` });

    if (!req.params.id) {
      // TODO zod parse should remove undefined type?
      throw new Error("Workspace id is required");
    }

    const equals = eq(workspaces.uuid, req.params.id);

    const workspace = await db.select().from(workspaces).where(equals).execute();
    const relations = await db.query.workspaces.findFirst({
      with: {
        account: true,
        profiles: true
      }
    });

    const response = gatewayResponse().success(200, { relations, workspace }, "Fetched workspace");

    return res.status(response.code).send(response);
  } catch (err) {
    const message = "Unable to fetch workspace";

    logger.error({ msg: message, err });

    const response = gatewayResponse().error(500, Error(message), message);

    return res.status(response.code).send(response);
  }
};

// @ts-expect-error no-unused-parameter
export const fetchWorkspacesHandler = async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(workspaces).execute();

    logger.info({ msg: `Fetching workspaces: ${result.length}` });

    const response = gatewayResponse().success(200, result, "Fetched workspaces");

    return res.status(response.code).send(response);
  } catch (err) {
    const message = "Unable to fetch workspaces";

    logger.error({ msg: message, err });

    const response = gatewayResponse().error(500, Error(message), message);

    return res.status(response.code).send(response);
  }
};
