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

/**
 * Comprehensive test accounts for multi-tenant testing
 *
 * Usage:
 * - `pnpm seed` - Creates local accounts only (for database/API testing)
 * - `pnpm seed --supabase=true` - Creates both local accounts AND Supabase auth users
 *
 * Supabase Notes:
 * - Replace emails with working emails when using --supabase=true
 * - Disable email confirmation in Supabase Auth settings for easier testing
 * - Or manually confirm users in Supabase dashboard after seeding
 *
 * Local-only accounts (default) are perfect for:
 * - Database structure testing
 * - API endpoint testing with manually created JWTs
 * - Multi-tenant relationship testing
 */
const accountsArray: SeedAccountType[] = [
  // Super Admin Account
  {
    fullName: "Super Admin",
    phone: "+1-555-001-0001",
    email: "admin@example.com",
    isSuperAdmin: true,
    status: "active",
    password: "password123"
  },

  // Active Business Users
  {
    fullName: "Alice Johnson",
    phone: "+1-555-001-0002",
    email: "alice@acmecorp.com",
    isSuperAdmin: false,
    status: "active",
    password: "password123"
  },
  {
    fullName: "Bob Wilson",
    phone: "+1-555-001-0003",
    email: "bob@techstartup.com",
    isSuperAdmin: false,
    status: "active",
    password: "password123"
  },
  {
    fullName: "Carol Martinez",
    phone: "+1-555-001-0004",
    email: "carol@designstudio.com",
    isSuperAdmin: false,
    status: "active",
    password: "password123"
  },

  // Team Members (will be added to existing workspaces)
  {
    fullName: "David Chen",
    phone: "+1-555-001-0005",
    email: "david@acmecorp.com",
    isSuperAdmin: false,
    status: "active",
    password: "password123"
  },
  {
    fullName: "Emma Thompson",
    phone: "+1-555-001-0006",
    email: "emma@techstartup.com",
    isSuperAdmin: false,
    status: "active",
    password: "password123"
  },

  // Inactive/Suspended Users (for testing account status)
  {
    fullName: "Frank Rodriguez",
    phone: "+1-555-001-0007",
    email: "frank@suspended.com",
    isSuperAdmin: false,
    status: "suspended",
    password: "password123"
  },
  {
    fullName: "Grace Lee",
    phone: "+1-555-001-0008",
    email: "grace@inactive.com",
    isSuperAdmin: false,
    status: "inactive",
    password: "password123"
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

// Realistic workspace configurations for testing
const workspaceConfigs = [
  {
    name: "ACME Corp - Main",
    description: "Primary workspace for ACME Corporation's project management and collaboration.",
    ownerEmail: "alice@acmecorp.com"
  },
  {
    name: "ACME Corp - R&D",
    description: "Research and Development workspace for experimental projects.",
    ownerEmail: "alice@acmecorp.com"
  },
  {
    name: "TechStartup - Development",
    description: "Software development workspace for our SaaS platform.",
    ownerEmail: "bob@techstartup.com"
  },
  {
    name: "TechStartup - Marketing",
    description: "Marketing campaigns and customer outreach workspace.",
    ownerEmail: "bob@techstartup.com"
  },
  {
    name: "Design Studio Pro",
    description: "Creative workspace for client projects and design collaboration.",
    ownerEmail: "carol@designstudio.com"
  }
];

// Cross-workspace memberships for realistic multi-tenant scenarios
const membershipConfigs = [
  // ACME Corp - Main workspace members
  { workspaceName: "ACME Corp - Main", memberEmail: "alice@acmecorp.com", role: "admin", profileName: "Alice Johnson" },
  { workspaceName: "ACME Corp - Main", memberEmail: "david@acmecorp.com", role: "user", profileName: "David Chen" },

  // ACME Corp - R&D workspace members
  {
    workspaceName: "ACME Corp - R&D",
    memberEmail: "alice@acmecorp.com",
    role: "admin",
    profileName: "Alice (R&D Lead)"
  },
  {
    workspaceName: "ACME Corp - R&D",
    memberEmail: "david@acmecorp.com",
    role: "admin",
    profileName: "David (Senior Dev)"
  },

  // TechStartup - Development workspace members
  {
    workspaceName: "TechStartup - Development",
    memberEmail: "bob@techstartup.com",
    role: "admin",
    profileName: "Bob Wilson"
  },
  {
    workspaceName: "TechStartup - Development",
    memberEmail: "emma@techstartup.com",
    role: "user",
    profileName: "Emma Thompson"
  },

  // TechStartup - Marketing workspace members
  {
    workspaceName: "TechStartup - Marketing",
    memberEmail: "bob@techstartup.com",
    role: "admin",
    profileName: "Bob (CEO)"
  },
  {
    workspaceName: "TechStartup - Marketing",
    memberEmail: "emma@techstartup.com",
    role: "admin",
    profileName: "Emma (Marketing Lead)"
  },

  // Design Studio workspace members
  {
    workspaceName: "Design Studio Pro",
    memberEmail: "carol@designstudio.com",
    role: "admin",
    profileName: "Carol Martinez"
  },

  // Cross-company collaboration (Emma consulting for ACME)
  {
    workspaceName: "ACME Corp - Main",
    memberEmail: "emma@techstartup.com",
    role: "user",
    profileName: "Emma (Consultant)"
  }
];

async function createWorkspace(name: string, description: string, accountId: string): Promise<WorkspaceSelectType> {
  const [workspace] = await db.insert(workspaces).values({ name, description, accountId }).returning();

  if (!workspace) {
    throw new Error(`Unable to create workspace: ${name}`);
  }

  logger.info(`Created workspace: ${workspace.name} (${workspace.uuid})`);
  return workspace;
}

async function createProfile(workspaceId: string, accountId: string, profileName: string): Promise<ProfileSelectType> {
  const [profile] = await db
    .insert(profiles)
    .values({
      name: profileName,
      workspaceId,
      accountId
    })
    .returning();

  if (!profile) {
    throw new Error(`Unable to create profile: ${profileName}`);
  }

  logger.info(`Created profile: ${profile.name} in workspace ${workspaceId}`);
  return profile;
}

async function createMembership(
  workspaceId: string,
  accountId: string,
  role: "admin" | "user"
): Promise<WorkspaceMembershipInsertType> {
  const [membership] = await db.insert(workspaceMemberships).values({ role, workspaceId, accountId }).returning();

  if (!membership) {
    throw new Error(`Unable to create membership for account: ${accountId}`);
  }

  logger.info(`Created ${role} membership for account ${accountId} in workspace ${workspaceId}`);
  return membership;
}

export async function seedAccounts(
  syncWithSupabase = false,
  signUpSupabase?: (email: string, password: string) => Promise<User | Error>
): Promise<void> {
  logger.info("🌱 Starting comprehensive multi-tenant seed process...");

  // Step 1: Create all accounts
  logger.info("📝 Creating accounts...");
  const createdAccounts = new Map<string, AccountSelectType>();

  for (const accountData of accountsArray) {
    let supabaseUserId: string | undefined;

    if (syncWithSupabase && signUpSupabase && accountData.email && accountData.password) {
      logger.info(`Attempting to create Supabase user for: ${accountData.email}`);
      const supabaseUser = await signUpSupabase(accountData.email, accountData.password);
      if (supabaseUser instanceof Error) {
        logger.error(
          `Failed to create Supabase user ${accountData.email}: ${supabaseUser.message}. Skipping this user.`
        );
        continue; // Skip this user if Supabase creation fails
      }
      supabaseUserId = supabaseUser.id;
      logger.info(`Supabase user created for ${accountData.email} with UUID: ${supabaseUserId}`);
    }

    // Prepare account object for local DB insertion, omitting the password
    const acc: InferInsertModel<typeof accounts> = {
      fullName: accountData.fullName,
      email: accountData.email,
      phone: accountData.phone,
      isSuperAdmin: accountData.isSuperAdmin,
      status: accountData.status || "active",
      uuid: supabaseUserId // If supabaseUserId is undefined, Drizzle uses defaultRandom()
    };

    const account = await createAccount(acc);
    createdAccounts.set(account.email, account);
  }

  // Step 2: Create workspaces
  logger.info("🏢 Creating workspaces...");
  const createdWorkspaces = new Map<string, WorkspaceSelectType>();

  for (const workspaceConfig of workspaceConfigs) {
    const ownerAccount = createdAccounts.get(workspaceConfig.ownerEmail);
    if (!ownerAccount) {
      logger.warn(`Owner account not found for workspace: ${workspaceConfig.name}`);
      continue;
    }

    const workspace = await createWorkspace(workspaceConfig.name, workspaceConfig.description, ownerAccount.uuid);
    createdWorkspaces.set(workspace.name, workspace);
  }

  // Step 3: Create memberships and profiles
  logger.info("👥 Creating workspace memberships and profiles...");

  for (const membershipConfig of membershipConfigs) {
    const workspace = createdWorkspaces.get(membershipConfig.workspaceName);
    const memberAccount = createdAccounts.get(membershipConfig.memberEmail);

    if (!workspace) {
      logger.warn(`Workspace not found: ${membershipConfig.workspaceName}`);
      continue;
    }

    if (!memberAccount) {
      logger.warn(`Member account not found: ${membershipConfig.memberEmail}`);
      continue;
    }

    // Skip suspended/inactive accounts from getting workspace access
    if (memberAccount.status !== "active") {
      logger.info(`Skipping membership for ${memberAccount.status} account: ${memberAccount.email}`);
      continue;
    }

    await createMembership(workspace.uuid, memberAccount.uuid, membershipConfig.role as "admin" | "user");

    await createProfile(workspace.uuid, memberAccount.uuid, membershipConfig.profileName);
  }

  logger.info("✅ Comprehensive multi-tenant seed completed!");
  logger.info(`📊 Summary:`);
  logger.info(`   • ${createdAccounts.size} accounts created`);
  logger.info(`   • ${createdWorkspaces.size} workspaces created`);
  logger.info(`   • ${membershipConfigs.length} memberships configured`);

  // Log test scenarios created
  logger.info("🧪 Test scenarios available:");
  logger.info("   • Cross-workspace memberships (Alice, Bob, Emma with multiple workspaces)");
  logger.info("   • Different roles (admin/user) within same organization");
  logger.info("   • Cross-company collaboration (Emma consulting for ACME)");
  logger.info("   • Account status variations (active/suspended/inactive)");
  logger.info("   • Super admin capabilities");
}
