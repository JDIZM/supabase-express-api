import { logger } from "@/helpers/index.ts";
import { workspaceInsertSchema, workspaces, type WorkspaceInsertType, type WorkspaceSelectType } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";

export const createDbWorkspace = async (workspace: WorkspaceInsertType): Promise<WorkspaceSelectType> => {
  const { name, accountId, description } = workspace;

  workspaceInsertSchema.parse({ name, accountId, description });

  const [result] = await db.insert(workspaces).values({ name, accountId, description }).returning();

  if (!result) {
    throw new Error("Unable to create workspace");
  }

  logger.info({ msg: `Created workspace ${name} for ${accountId}` });

  return result;
};
