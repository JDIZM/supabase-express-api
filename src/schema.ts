import { pgTable, uuid, text, timestamp, varchar, boolean, unique, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm/relations";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// Validate UUID - direct validator for UUID strings
export const uuidSchema = z.uuid();

// Validate UUID in object form (for backward compatibility)
export const uuidObjectSchema = z.object({ uuid: uuidSchema });

export const accounts = pgTable("accounts", {
  uuid: uuid("uuid").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 256 }),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).defaultNow(),
  email: text("email").unique().notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false),
  status: text("status", { enum: ["active", "inactive", "suspended"] })
    .default("active")
    .notNull()
});

export const accountRelations = relations(accounts, ({ many }) => ({
  workspaces: many(workspaceMemberships),
  profiles: many(profiles)
}));

// In drizzle-zod 0.7.0, schema customization must be done differently
export const accountInsertSchema = createInsertSchema(accounts);
export const accountSelectSchema = createSelectSchema(accounts);
export const accountUpdateSchema = createUpdateSchema(accounts);

// Use drizzle-orm's inference types directly to avoid zod compatibility issues
export type AccountInsertType = InferInsertModel<typeof accounts>;
export type AccountSelectType = InferSelectModel<typeof accounts>;

export type AccountWithRelations = AccountSelectType & {
  workspaces: WorkspaceMembershipSelectType[];
  profiles: Pick<ProfileSelectType, "uuid" | "name" | "workspaceId">[];
};

// Workspaces belong to a user/account, has many profiles.
export const workspaces = pgTable("workspaces", {
  uuid: uuid("uuid").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).defaultNow(),
  accountId: uuid("account_id").notNull()
});

export const workspaceRelations = relations(workspaces, ({ one, many }) => ({
  account: one(accounts, {
    fields: [workspaces.accountId],
    references: [accounts.uuid]
  }),
  profiles: many(profiles),
  memberships: many(workspaceMemberships)
}));

export const workspaceInsertSchema = createInsertSchema(workspaces);
export const workspaceSelectSchema = createSelectSchema(workspaces);

export type WorkspaceInsertType = InferInsertModel<typeof workspaces>;
export type WorkspaceSelectType = InferSelectModel<typeof workspaces>;

export const profiles = pgTable(
  "profiles",
  {
    uuid: uuid("uuid").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).defaultNow(),
    workspaceId: uuid("workspace_id").notNull(),
    accountId: uuid("account_id").notNull().default("00000000-0000-0000-0000-000000000000")
  },
  (table) => ({
    uniqueAccountWorkspace: unique("unique_account_workspace").on(table.accountId, table.workspaceId),
    accountIdIdx: index("profiles_account_id_idx").on(table.accountId),
    workspaceIdIdx: index("profiles_workspace_id_idx").on(table.workspaceId),
    workspaceAccountIdx: index("profiles_workspace_account_idx").on(table.workspaceId, table.accountId)
  })
);

export const profileRelations = relations(profiles, ({ one }) => ({
  account: one(accounts, {
    fields: [profiles.accountId],
    references: [accounts.uuid]
  }),
  workspace: one(workspaces, {
    fields: [profiles.workspaceId],
    references: [workspaces.uuid]
  })
}));

export const profileInsertSchema = createInsertSchema(profiles);
export const profileSelectSchema = createSelectSchema(profiles);

export type ProfileInsertType = InferInsertModel<typeof profiles>;
export type ProfileSelectType = InferSelectModel<typeof profiles>;

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    uuid: uuid("uuid").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    accountId: uuid("account_id").notNull(),
    role: text("role", { enum: ["admin", "user"] }).notNull()
  },
  (table) => ({
    uniqueMembershipPerWorkspace: unique("unique_membership_per_workspace").on(table.accountId, table.workspaceId),
    accountIdIdx: index("memberships_account_id_idx").on(table.accountId),
    workspaceIdIdx: index("memberships_workspace_id_idx").on(table.workspaceId)
  })
);

export const workspaceMembershipsRelations = relations(workspaceMemberships, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMemberships.workspaceId],
    references: [workspaces.uuid]
  }),
  account: one(accounts, {
    fields: [workspaceMemberships.accountId],
    references: [accounts.uuid]
  })
}));

export const workspaceMembershipInsertSchema = createInsertSchema(workspaceMemberships);
export const workspaceMembershipSelectSchema = createSelectSchema(workspaceMemberships);

export type WorkspaceMembershipInsertType = InferInsertModel<typeof workspaceMemberships>;
export type WorkspaceMembershipSelectType = InferSelectModel<typeof workspaceMemberships>;

// Audit Log table for tracking admin operations and sensitive actions
export const auditLogs = pgTable(
  "audit_logs",
  {
    uuid: uuid("uuid").defaultRandom().primaryKey(),
    action: text("action").notNull(), // e.g., "account_status_updated", "role_changed", "workspace_deleted"
    entityType: text("entity_type").notNull(), // e.g., "account", "workspace", "membership"
    entityId: uuid("entity_id").notNull(), // UUID of the affected entity
    actorId: uuid("actor_id").notNull(), // UUID of the user performing the action
    actorEmail: text("actor_email").notNull(), // Email for easier identification
    targetId: uuid("target_id"), // UUID of the target user/entity (for actions affecting others)
    targetEmail: text("target_email"), // Email of the target user
    details: jsonb("details"), // Additional context (old values, new values, etc.)
    ipAddress: text("ip_address"), // IP address of the actor
    userAgent: text("user_agent"), // User agent string
    workspaceId: uuid("workspace_id"), // Workspace context if applicable
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).defaultNow()
  },
  (table) => ({
    actionIdx: index("audit_logs_action_idx").on(table.action),
    actorIdIdx: index("audit_logs_actor_id_idx").on(table.actorId),
    entityTypeIdx: index("audit_logs_entity_type_idx").on(table.entityType),
    entityIdIdx: index("audit_logs_entity_id_idx").on(table.entityId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
    workspaceIdIdx: index("audit_logs_workspace_id_idx").on(table.workspaceId)
  })
);

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
  actor: one(accounts, {
    fields: [auditLogs.actorId],
    references: [accounts.uuid]
  }),
  target: one(accounts, {
    fields: [auditLogs.targetId],
    references: [accounts.uuid]
  }),
  workspace: one(workspaces, {
    fields: [auditLogs.workspaceId],
    references: [workspaces.uuid]
  })
}));

export const auditLogInsertSchema = createInsertSchema(auditLogs);
export const auditLogSelectSchema = createSelectSchema(auditLogs);

export type AuditLogInsertType = InferInsertModel<typeof auditLogs>;
export type AuditLogSelectType = InferSelectModel<typeof auditLogs>;
