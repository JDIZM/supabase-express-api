/**
 * Development Setup Script
 * 
 * Creates additional workspaces for existing accounts in the database.
 * This is meant to be used AFTER running the seed script.
 * 
 * Differences from seed.ts:
 * - seed.ts: Creates initial accounts, workspaces, and memberships (run once)
 * - dev-setup.ts: Creates additional workspaces for existing accounts (run anytime)
 * 
 * Usage:
 * - Run seed first: `pnpm seed`
 * - Then add workspaces: `pnpm dev:workspace --email=alice@acmecorp.com --name="New Project"`
 */
import { db } from "@/services/db/drizzle.ts";
import {
  profiles,
  workspaces,
  workspaceMemberships,
  accounts,
  type AccountSelectType,
  type WorkspaceSelectType,
  type ProfileSelectType,
  type WorkspaceMembershipInsertType
} from "@/schema.ts";
import { logger } from "@/helpers/index.ts";
import { eq } from "drizzle-orm";

interface CreateWorkspaceOptions {
  accountEmail: string;
  workspaceName: string;
  profileName?: string;
  role?: "admin" | "user";
}

async function findAccountByEmail(email: string): Promise<AccountSelectType | null> {
  const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
  return account || null;
}

async function createWorkspaceForAccount(options: CreateWorkspaceOptions): Promise<{
  workspace: WorkspaceSelectType;
  profile: ProfileSelectType;
  membership: WorkspaceMembershipInsertType;
}> {
  const { accountEmail, workspaceName, profileName, role = "admin" } = options;

  logger.info(`Creating workspace "${workspaceName}" for account: ${accountEmail}`);

  // Find the account
  const account = await findAccountByEmail(accountEmail);
  if (!account) {
    throw new Error(`Account with email ${accountEmail} not found`);
  }

  // Create workspace
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: workspaceName,
      description: `Development workspace: ${workspaceName}`,
      accountId: account.uuid
    })
    .returning();

  if (!workspace) {
    throw new Error("Failed to create workspace");
  }

  logger.info(`✓ Created workspace: ${workspace.name} (${workspace.uuid})`);

  // Create profile
  const [profile] = await db
    .insert(profiles)
    .values({
      name: profileName || account.fullName?.split(" ")[0] || "Dev User",
      workspaceId: workspace.uuid,
      accountId: account.uuid
    })
    .returning();

  if (!profile) {
    throw new Error("Failed to create profile");
  }

  logger.info(`✓ Created profile: ${profile.name} (${profile.uuid})`);

  // Create membership
  const [membership] = await db
    .insert(workspaceMemberships)
    .values({
      role,
      workspaceId: workspace.uuid,
      accountId: account.uuid
    })
    .returning();

  if (!membership) {
    throw new Error("Failed to create membership");
  }

  logger.info(`✓ Created membership with role: ${membership.role}`);

  return { workspace, profile, membership };
}

async function createMultipleWorkspaces(
  accountEmail: string,
  workspaceConfigs: Array<{ name: string; profileName?: string; role?: "admin" | "user" }>
): Promise<void> {
  logger.info(`Creating ${workspaceConfigs.length} workspaces for ${accountEmail}`);

  for (const config of workspaceConfigs) {
    try {
      await createWorkspaceForAccount({
        accountEmail,
        workspaceName: config.name,
        profileName: config.profileName,
        role: config.role
      });
    } catch (error) {
      logger.error(`Failed to create workspace "${config.name}": ${error}`);
      throw error;
    }
  }

  logger.info(`✓ Successfully created all workspaces for ${accountEmail}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    logger.info("Usage examples:");
    logger.info("  # Create single workspace");
    logger.info("  pnpm dev:workspace --email=alice@acmecorp.com --name='Test Workspace'");
    logger.info("  # Create multiple workspaces");
    logger.info("  pnpm dev:workspaces --email=bob@techstartup.com");
    logger.info("  # Create workspace with specific profile name and role");
    logger.info(
      "  pnpm dev:workspace --email=david@acmecorp.com --name='Client Project' --profile='David Chen' --role=user"
    );
    return;
  }

  const options = args
    .map((str) => str.replace(/^-+/, "").split("="))
    .reduce<{ [key: string]: string }>((acc, curr) => {
      const [key, value] = curr;
      if (!key || !value) return acc;
      acc[key] = value;
      return acc;
    }, {});

  const email = options.email;
  if (!email) {
    logger.error("Email is required. Use --email=your@email.com");
    process.exit(1);
  }

  // Check if account exists
  const account = await findAccountByEmail(email);
  if (!account) {
    logger.error(`Account with email ${email} not found. Run 'pnpm seed' first.`);
    process.exit(1);
  }

  // Single workspace creation (requires --name parameter)
  if (options.name) {
    await createWorkspaceForAccount({
      accountEmail: email,
      workspaceName: options.name,
      profileName: options.profile,
      role: options.role as "admin" | "user" | undefined
    });
    return;
  }

  // Multiple workspaces for testing (only when no --name provided)
  logger.info("No --name provided, creating multiple test workspaces...");
  const testWorkspaces = [
    { name: "Personal Projects", profileName: "James", role: "admin" as const },
    { name: "Client Work", profileName: "James D", role: "admin" as const },
    { name: "Team Collaboration", profileName: "JD", role: "user" as const },
    { name: "Sandbox Testing", profileName: "Dev", role: "admin" as const }
  ];

  await createMultipleWorkspaces(email, testWorkspaces);
}

try {
  await main();
  logger.info("✅ Development setup completed successfully");
  process.exit(0);
} catch (error) {
  logger.error({ msg: "❌ Development setup failed", error });
  process.exit(1);
}
