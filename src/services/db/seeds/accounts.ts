import { db } from "@/services/db/drizzle.ts";
import { profiles, workspaces, workspaceMemberships, accounts } from "@/schema.ts";
import type { InferInsertModel } from "drizzle-orm";

const accountsArray: InferInsertModel<typeof accounts>[] = [
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

async function createAccount(account: InferInsertModel<typeof accounts>) {
  const response = await db.insert(accounts).values(account).returning();
  console.log("created account: ", response);

  return response[0];
}

async function createWorkspace(accountId: string) {
  const workspace = await db
    .insert(workspaces)
    .values({
      name: "My Workspace",
      description: "This is a test workspace.",
      accountId
    })
    .returning();

  console.log("created workspace: ", workspace);

  return workspace[0];
}

async function createProfile(workspaceId: string, accountId: string) {
  const profile = await db
    .insert(profiles)
    .values({
      name: "JDIZM",
      workspaceId,
      accountId
    })
    .returning();

  console.log("created profile: ", profile);

  return profile[0];
}

async function createMembership(workspaceId: string, accountId: string) {
  const membership = await db
    .insert(workspaceMemberships)
    .values({
      role: "admin",
      workspaceId,
      accountId
    })
    .returning();

  console.log("created membership: ", membership);

  return membership[0];
}

export async function seedAccounts() {
  async function createAccounts(acc: InferInsertModel<typeof accounts>) {
    if (!acc) {
      throw new Error("no account specified");
    }

    const account = await createAccount(acc);

    if (!account) {
      throw new Error("Unable to create account");
    }
    const workspace = await createWorkspace(account.uuid);

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

  await Promise.all(accountsArray.map((account) => createAccounts(account)));
}
