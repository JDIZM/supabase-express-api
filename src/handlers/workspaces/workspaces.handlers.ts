import { workspaces, workspaceInsertSchema, uuidSchema } from "@/schema.ts";
import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { eq, type InferInsertModel } from "drizzle-orm";

export const createWorkspace = async (workspace: InferInsertModel<typeof workspaces>) => {
  const { name, accountId, description } = workspace;

  logger.debug("createWorkspace", name, accountId);

  workspaceInsertSchema.parse({ name, accountId, description });

  const result = await db.insert(workspaces).values({ name, accountId, description }).returning();

  return result;
};

export const createWorkspaceHandler = async (req: Request, res: Response) => {
  try {
    const { name, accountId, description } = req.body;

    logger.debug("createWorkspace", name, accountId);

    uuidSchema.parse({ uuid: accountId });

    workspaceInsertSchema.parse({ name, accountId, description });

    const workspace = await db.insert(workspaces).values({ name, accountId, description }).returning();

    const response = gatewayResponse().success(200, workspace, "HELLO");

    return res.status(response.code).send(response);
  } catch (err) {
    if (err instanceof Error) {
      logger.error("Unable to create workspace", 400, err);

      const response = gatewayResponse().error(400, err, "Unable to create workspace");

      return res.status(response.code).send(response);
    }

    logger.error("Unable to create user", 500, err);

    const response = gatewayResponse().error(500, Error("Unable to create user"), "Unable to create user");

    return res.status(response.code).send(response);
  }
};

export const fetchWorkspaceHandler = async (req: Request, res: Response) => {
  try {
    req.log.info("fetchWorkspaceHandler...");
    uuidSchema.parse({ uuid: req.params.id });

    const equals = eq(workspaces.uuid, req.params.id as string);

    const workspace = await db.select().from(workspaces).where(equals).execute();
    const relations = await db.query.workspaces.findFirst({
      with: {
        account: true,
        profiles: true
      }
    });

    logger.info("fetching workspace", workspace);

    const response = gatewayResponse().success(200, { relations, workspace }, "Fetched workspace");

    return res.status(response.code).send(response);
  } catch (err) {
    logger.error("", err);

    const response = gatewayResponse().error(500, Error("Unable to fetch workspace"), "Unable to fetch workspace");

    return res.status(response.code).send(response);
  }
};

export const fetchWorkspacesHandler = async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(workspaces).execute();

    logger.info("fetching workspaces");

    const response = gatewayResponse().success(200, result, "Fetched workspaces");

    return res.status(response.code).send(response);
  } catch (err) {
    const response = gatewayResponse().error(500, Error("Unable to fetch workspaces"), "Unable to fetch workspaces");

    logger.error(response);
    req.log.error(response);

    return res.status(response.code).send(response);
  }
};
