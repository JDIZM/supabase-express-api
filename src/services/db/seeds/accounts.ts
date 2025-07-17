import { db } from "@/services/db/drizzle.ts";
import {
  profiles,
  workspaces,
  workspaceMemberships,
  accounts,
  type AccountInsertType,
  type AccountSelectType,
  accountInsertSchema,
  type WorkspaceSelectType,
  type ProfileSelectType,
  type WorkspaceMembershipInsertType
} from "@/schema.ts";
import type { User } from "@supabase/supabase-js";
import { logger } from "@/helpers/index.ts";
import type { InferInsertModel } from "drizzle-orm";

type SeedAccountType = AccountInsertType & {
  password?: string; // Password is only needed for Supabase signup during seeding
};

// Replace the emails with working emails when seeding with Supabase.
const accountsArray: SeedAccountType[] = [
  {
    fullName: "James D",
    phone: "555-555-5555",
    email: "user1@example.com",
    isSuperAdmin: true,
    // Add a default password for seeding if using signUpWithSupabase
    password: "password123"
  },
  {
    fullName: "Jane D",
    phone: "555-555-5555",
    email: "user2@example.com",
    isSuperAdmin: false,
    password: "password123" // Temporary password for seeding
  }
];

async function createAccount(account: AccountInsertType): Promise<AccountSelectType> {
  accountInsertSchema.parse(account);
  const [result]: AccountSelectType[] = await db.insert(accounts).values(account).returning();
  console.log("created account: ", result);

  if (!result) {
    throw new Error("Unable to create account");
  }

  return result;
}

async function createWorkspace(accountId: string, index: number): Promise<WorkspaceSelectType> {
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: `My Workspace ${index}`,
      description: "This is a test workspace.",
      accountId: accountId
    })
    .returning();

  console.log("created workspace: ", workspace);

  if (!workspace) {
    throw new Error("Unable to create workspace");
  }

  return workspace;
}

async function createProfile(workspaceId: string, accountId: string): Promise<ProfileSelectType> {
  const [profile]: ProfileSelectType[] = await db
    .insert(profiles)
    .values({
      name: "JDIZM",
      workspaceId,
      accountId
    })
    .returning();

  if (!profile) {
    throw new Error("Unable to create profile");
  }

  console.log("created profile: ", profile);

  return profile;
}

async function createMembership(workspaceId: string, accountId: string): Promise<WorkspaceMembershipInsertType> {
  const [membership] = await db
    .insert(workspaceMemberships)
    .values({
      role: "admin",
      workspaceId,
      accountId
    })
    .returning();

  if (!membership) {
    throw new Error("Unable to create membership");
  }
  console.log("created membership: ", membership);

  return membership;
}

export async function seedAccounts(
  syncWithSupabase = false,
  signUpSupabase?: (email: string, password: string) => Promise<User | Error>
): Promise<void> {
  async function createSeedDataForAccount(accountData: SeedAccountType, index: number): Promise<void> {
    let supabaseUserId: string | undefined;

    if (syncWithSupabase && signUpSupabase && accountData.email && accountData.password) {
      logger.info(`Attempting to create Supabase user for: ${accountData.email}`);
      const supabaseUser = await signUpSupabase(accountData.email, accountData.password);
      if (supabaseUser instanceof Error) {
        logger.error(
          `Failed to create Supabase user ${accountData.email}: ${supabaseUser.message}. Skipping this user.`
        );
        // Decide how to handle Supabase signup failure during seeding:
        // For now, we'll try to create locally without a synced UUID or skip.
        // throw supabaseUser;
        // Or decide to continue without Supabase sync for this user
        return; // Skip this user if Supabase creation fails
      }
      supabaseUserId = supabaseUser.id;
      logger.info(`Supabase user created for ${accountData.email} with UUID: ${supabaseUserId}`);
    }

    // Prepare account object for local DB insertion, omitting the password
    const acc: InferInsertModel<typeof accounts> = {
      // accounts here refers to the table schema
      fullName: accountData.fullName,
      email: accountData.email,
      phone: accountData.phone,
      isSuperAdmin: accountData.isSuperAdmin,
      uuid: supabaseUserId // If supabaseUserId is undefined, Drizzle uses defaultRandom()
    };

    const account = await createAccount(acc);

    if (!account) {
      throw new Error("Unable to create account");
    }

    const workspace = await createWorkspace(account.uuid, index);

    if (!workspace) {
      throw new Error("Unable to create workspace");
    }

    const profile = await createProfile(workspace.uuid, account.uuid);

    if (!profile) {
      throw new Error("Unable to create profile");
    }

    const membership = await createMembership(workspace.uuid, account.uuid);

    if (!membership) {
      throw new Error("Unable to create membership");
    }
  }

  await Promise.all(accountsArray.map((accData, index) => createSeedDataForAccount(accData, index)));
}
