import type { db } from "@/services/db/drizzle.ts";

/**
 * Database transaction type for use across all database methods
 * Can be either a transaction context or the main database instance
 */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;
