import { pgTable, uuid, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  uuid: uuid("uuid").defaultRandom().primaryKey(),
  fullName: text("full_name"),
  phone: varchar("phone", { length: 256 }),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).defaultNow()
});
