import { logger } from "@/helpers/index.ts";
import { workspaceInsertSchema, workspaces, type WorkspaceInsertType, type WorkspaceSelectType } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { type DbTransaction } from "@/types/database.ts";

export const createDbWorkspace = async (
  workspace: WorkspaceInsertType,
  tx?: DbTransaction
): Promise<WorkspaceSelectType> => {
  const { name, accountId, description } = workspace;

  const validationResult = workspaceInsertSchema.safeParse({ name, accountId, description });
  if (!validationResult.success) {
    throw new Error(`Workspace validation failed: ${validationResult.error.message}`);
  }

  const database = tx || db;
  const [result] = await database.insert(workspaces).values({ name, accountId, description }).returning();

  if (!result) {
    throw new Error("Unable to create workspace");
  }

  logger.info({ msg: `Created workspace ${name} for ${accountId}` });

  return result;
};
