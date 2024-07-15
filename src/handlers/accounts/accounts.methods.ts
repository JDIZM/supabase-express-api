import { logger } from "@/helpers/index.ts";
import { accountInsertSchema, accounts, uuidSchema } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { eq, type InferInsertModel } from "drizzle-orm";

export async function createDbAccount(account: InferInsertModel<typeof accounts>) {
  accountInsertSchema.parse(account);

  const response = await db.insert(accounts).values(account).returning();

  const result = response[0];

  if (!result) {
    throw new Error("Unable to create account");
  }

  logger.info(`Created account with UUID: ${result.uuid}`);

  return result.uuid;
}

export async function getAccountById(accountId: string) {
  uuidSchema.parse({ uuid: accountId });

  const equals = eq(accounts.uuid, accountId);
  const result = await db.select().from(accounts).where(equals).execute();

  return result;
}
