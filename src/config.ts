import { logger } from "@/helpers/index.ts";
import dotenv from "dotenv";

export const stages = ["development", "production", "test"] as const;

export type Stage = (typeof stages)[number];

export const ENV = process.env.NODE_ENV ?? "development";

export const getStage = (env: string): Stage => {
  if (!stages.includes(env as Stage)) {
    throw new Error(`Invalid environment: ${ENV}`);
  }
  return env as Stage;
};

export const STAGE = getStage(ENV);

logger.info(`running in env: ${STAGE}`);

if (STAGE !== "production") {
  dotenv.config();
}

/**
 * Get Supabase publishable key - supports both new (2025+) and legacy formats
 */
const getSupabasePublishableKey = (): string => {
  if (process.env.SUPABASE_PUBLISHABLE_KEY) {
    return process.env.SUPABASE_PUBLISHABLE_KEY;
  }
  return process.env.SUPABASE_PK || process.env.SUPABASE_ANON_KEY || "";
};

export const config = {
  env: STAGE,
  port: process.env.PORT || 4000,
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`,
  db_host: process.env.POSTGRES_HOST || "localhost",
  db_port: Number(process.env.POSTGRES_PORT) || 5432,
  db_user: process.env.POSTGRES_USER || "postgres",
  db_password: process.env.POSTGRES_PASSWORD || "postgres",
  db_name: process.env.POSTGRES_DB || "postgres",
  supabaseUrl: process.env.SUPABASE_URL || "https://example.supabase.co",
  supabasePublishableKey: getSupabasePublishableKey(),
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY
};
