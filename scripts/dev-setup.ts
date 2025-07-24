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

function parseArguments(args: string[]): Record<string, string> {
  const options: Record<string, string> = {};
  
  for (const arg of args) {
    // Skip if not a flag
    if (!arg.startsWith('--')) continue;
    
    // Remove leading dashes
    const cleanArg = arg.replace(/^-+/, '');
    
    // Split by first equals sign to handle values with equals signs
    const equalIndex = cleanArg.indexOf('=');
    if (equalIndex === -1) continue;
    
    const key = cleanArg.substring(0, equalIndex);
    const value = cleanArg.substring(equalIndex + 1);
    
    // Remove surrounding quotes if present
    const trimmedValue = value.replace(/^['"]|['"]$/g, '');
    
    if (key && trimmedValue) {
      options[key] = trimmedValue;
    }
  }
  
  return options;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    logger.info("Usage examples:");
    logger.info("  # Create single workspace");
    logger.info("  pnpm dev:workspace --email=user@example.com --name='Test Workspace'");
    logger.info("  # Create multiple workspaces");
    logger.info("  pnpm dev:workspaces --email=user@example.com");
    logger.info("  # Create workspace with specific profile name and role");
    logger.info("  pnpm dev:workspace --email=user@example.com --name='Client Project' --profile='John' --role=user");
    return;
  }

  const options = parseArguments(args);

  // Validate email
  const email = options.email;
  if (!email) {
    logger.error("Email is required. Use --email=your@email.com");
    process.exit(1);
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logger.error(`Invalid email format: ${email}`);
    process.exit(1);
  }

  // Check if account exists
  const account = await findAccountByEmail(email);
  if (!account) {
    logger.error(`Account with email ${email} not found. Run 'pnpm seed' first.`);
    process.exit(1);
  }

  // Validate role if provided
  if (options.role && !['admin', 'user'].includes(options.role)) {
    logger.error(`Invalid role: ${options.role}. Must be 'admin' or 'user'.`);
    process.exit(1);
  }

  // Single workspace creation (requires --name parameter)
  if (options.name) {
    // Validate workspace name
    if (options.name.trim().length === 0) {
      logger.error("Workspace name cannot be empty.");
      process.exit(1);
    }
    
    if (options.name.length > 100) {
      logger.error("Workspace name must be 100 characters or less.");
      process.exit(1);
    }
    
    await createWorkspaceForAccount({
      accountEmail: email,
      workspaceName: options.name.trim(),
      profileName: options.profile?.trim(),
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
