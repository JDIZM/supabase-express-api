import { logger } from "@/helpers/index.ts";
import {
  accountInsertSchema,
  accounts,
  accountSelectSchema,
  uuidSchema,
  type AccountInsertType,
  type AccountSelectType,
  type AccountWithRelations
} from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { type DbTransaction } from "@/types/database.ts";
import { eq } from "drizzle-orm";

export async function createDbAccount(account: AccountInsertType, tx?: DbTransaction): Promise<string> {
  const validationResult = accountInsertSchema.safeParse(account);
  if (!validationResult.success) {
    throw new Error(`Account validation failed: ${validationResult.error.message}`);
  }

  const database = tx || db;
  const response = await database.insert(accounts).values(account).returning();

  const result = response[0];

  if (!result) {
    throw new Error("Unable to create account");
  }

  logger.info(`Created account with UUID: ${result.uuid}`);

  return result.uuid;
}

/**
 * Get account by ID.
 * @param accountId - The UUID of the account to retrieve.
 * @returns The account object.
 */
export async function getAccountById(accountId: string): Promise<AccountSelectType[]> {
  const validationResult = uuidSchema.safeParse({ uuid: accountId });
  if (!validationResult.success) {
    throw new Error(`Invalid account ID: ${validationResult.error.message}`);
  }

  const equals = eq(accounts.uuid, accountId);
  const result = await db.select().from(accounts).where(equals).execute();

  const resultValidation = accountSelectSchema.safeParse(result);
  if (!resultValidation.success) {
    throw new Error(`Account data validation failed: ${resultValidation.error.message}`);
  }
  logger.info(`Retrieved account with UUID: ${accountId}`);

  if (result.length === 0) {
    throw new Error("Account not found");
  }

  if (result.length > 1) {
    throw new Error("Multiple accounts found");
  }

  return result;
}

export async function getAccountWithRelations(accountId: string): Promise<AccountWithRelations> {
  const validationResult = uuidSchema.safeParse({ uuid: accountId });
  if (!validationResult.success) {
    throw new Error(`Invalid account ID: ${validationResult.error.message}`);
  }

  const equals = eq(accounts.uuid, accountId);

  const result = await db.query.accounts.findFirst({
    where: equals,
    with: {
      workspaces: true,
      profiles: {
        columns: {
          uuid: true,
          name: true,
          workspaceId: true
        }
      }
    }
  });

  if (!result) {
    throw new Error("Account not found");
  }

  return result;
}
