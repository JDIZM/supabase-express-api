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
import { eq } from "drizzle-orm";

export async function createDbAccount(account: AccountInsertType): Promise<string> {
  accountInsertSchema.parse(account);

  const response = await db.insert(accounts).values(account).returning();

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
  uuidSchema.parse({ uuid: accountId });

  const equals = eq(accounts.uuid, accountId);
  const result = await db.select().from(accounts).where(equals).execute();

  accountSelectSchema.parse(result);
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
  uuidSchema.parse({ uuid: accountId });

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
