import { pgTable, uuid, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm/relations";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// Validate UUID
export const uuidSchema = z.object({ uuid: z.string().uuid() });

export const accounts = pgTable("accounts", {
  uuid: uuid("uuid").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  phone: varchar("phone", { length: 256 }),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).defaultNow(),
  email: text("email").unique().notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false)
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
  profiles: many(profiles)
}));

export const workspaceInsertSchema = createInsertSchema(workspaces);
export const workspaceSelectSchema = createSelectSchema(workspaces);

export type WorkspaceInsertType = InferInsertModel<typeof workspaces>;
export type WorkspaceSelectType = InferSelectModel<typeof workspaces>;

export const profiles = pgTable("profiles", {
  uuid: uuid("uuid").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).defaultNow(),
  workspaceId: uuid("workspace_id").notNull(),
  accountId: uuid("account_id").notNull().default("00000000-0000-0000-0000-000000000000")
});

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

export const workspaceMemberships = pgTable("workspace_memberships", {
  uuid: uuid("uuid").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  accountId: uuid("account_id").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull()
});

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
