import { logger } from "@/helpers/index.ts";
import { profileInsertSchema, profiles, uuidSchema, type ProfileInsertType, type ProfileSelectType } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { eq, type InferInsertModel } from "drizzle-orm";
import { type DbTransaction } from "@/types/database.ts";

export async function createDbProfile(
  profile: InferInsertModel<typeof profiles>,
  tx?: DbTransaction
): Promise<ProfileInsertType> {
  logger.info({ msg: `Creating profile for workspace id: ${profile.workspaceId}` });

  const validationResult = profileInsertSchema.safeParse(profile);
  if (!validationResult.success) {
    throw new Error(`Profile validation failed: ${validationResult.error.message}`);
  }

  const database = tx || db;
  const [result] = await database.insert(profiles).values(profile).returning();

  if (!result) {
    throw new Error("Unable to create profile");
  }

  logger.info({ msg: `Created profile for workspace id: ${profile.workspaceId} with profileName: ${profile.name}` });

  return result;
}

export async function getProfileById(profileId: string): Promise<ProfileSelectType[]> {
  const validationResult = uuidSchema.safeParse({ uuid: profileId });
  if (!validationResult.success) {
    throw new Error(`Invalid profile ID: ${validationResult.error.message}`);
  }

  const equals = eq(profiles.uuid, profileId);

  const result = await db.select().from(profiles).where(equals).execute();

  return result;
}

export async function getProfilesByAccountId(accountId: string): Promise<ProfileSelectType[]> {
  const validationResult = uuidSchema.safeParse({ uuid: accountId });
  if (!validationResult.success) {
    throw new Error(`Invalid account ID: ${validationResult.error.message}`);
  }

  const equals = eq(profiles.accountId, accountId);

  const relations = await db.query.profiles.findMany({
    where: equals,
    with: {
      account: true,
      workspace: true
    }
  });

  return relations;
}

export const hasExistingProfile = async ({
  accountId,
  workspaceId
}: {
  accountId: string;
  workspaceId: string;
}): Promise<boolean> => {
  const profiles = await getProfilesByAccountId(accountId);

  const result = profiles.find((profile) => profile.workspaceId === workspaceId);

  logger.debug({ msg: `Profile exists for workspace: ${!!result}`, result });

  return !!result;
};
