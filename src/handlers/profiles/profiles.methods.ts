import { logger } from "@/helpers/index.ts";
import { profileInsertSchema, profiles, uuidSchema } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { eq, type InferInsertModel } from "drizzle-orm";

export async function createDbProfile(profile: InferInsertModel<typeof profiles>) {
  try {
    logger.info({ msg: `Creating profile for workspace id: ${profile.workspaceId}` });

    profileInsertSchema.parse(profile);

    const [result] = await db.insert(profiles).values(profile).returning();

    if (!result) {
      throw new Error("Unable to create profile");
    }

    logger.info({ msg: `Created profile for workspace id: ${profile.workspaceId}` });

    return result;
  } catch (error) {
    logger.error({ msg: "Error creating profile", err: error });
    throw error;
  }
}

export async function getProfileById(profileId: string) {
  try {
    uuidSchema.parse({ uuid: profileId });

    const equals = eq(profiles.uuid, profileId);

    const result = await db.select().from(profiles).where(equals).execute();

    return result;
  } catch (error) {
    logger.error({ msg: "Error getting profile by id", err: error });
    throw error;
  }
}

export async function getProfilesByAccountId(accountId: string) {
  try {
    uuidSchema.parse({ uuid: accountId });

    const equals = eq(profiles.accountId, accountId);

    const relations = await db.query.profiles.findMany({
      where: equals,
      with: {
        account: true,
        workspace: true
      }
    });

    return relations;
  } catch (error) {
    logger.error({ msg: "Error getting profiles by account id", err: error });
    throw error;
  }
}

export const hasExistingProfile = async ({
  accountId,
  workspaceId
}: {
  accountId: string;
  workspaceId: string;
}): Promise<boolean> => {
  try {
    const profiles = await getProfilesByAccountId(accountId);

    const result = profiles.find((profile) => profile.workspaceId === workspaceId);

    logger.debug({ msg: `Profile exists for workspace: ${!!result}`, result });

    return !!result;
  } catch (error) {
    logger.error({ msg: "Error checking for existing profile", err: error });
    throw error;
  }
};
