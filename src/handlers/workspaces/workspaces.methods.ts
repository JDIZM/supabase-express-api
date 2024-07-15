import { logger } from "@/helpers/index.ts";
import { workspaceInsertSchema, workspaces } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import type { InferInsertModel } from "drizzle-orm";

export const createDbWorkspace = async (workspace: InferInsertModel<typeof workspaces>) => {
  const { name, accountId, description } = workspace;

  workspaceInsertSchema.parse({ name, accountId, description });

  const [result] = await db.insert(workspaces).values({ name, accountId, description }).returning();

  if (!result) {
    throw new Error("Unable to create workspace");
  }

  logger.info({ msg: `Created workspace ${name} for ${accountId}` });

  return result;
};
