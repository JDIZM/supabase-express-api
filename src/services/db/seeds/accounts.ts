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
import type { InferInsertModel } from "drizzle-orm";

const accountsArray: AccountInsertType[] = [
  {
    fullName: "James D",
    phone: "555-555-5555",
    email: "james.d@example.com",
    isSuperAdmin: true
  },
  {
    fullName: "Jane D",
    phone: "555-555-5555",
    email: "jane.d@example.com"
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

export async function seedAccounts(): Promise<void> {
  async function createAccounts(acc: InferInsertModel<typeof accounts>, index: number): Promise<void> {
    if (!acc) {
      throw new Error("no account specified");
    }

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

  await Promise.all(accountsArray.map((account, index) => createAccounts(account, index)));
}
