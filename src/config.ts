import dotenv from "dotenv";
import { logger } from "@/helpers/index.ts";

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

export const config = {
  env: STAGE,
  port: process.env.PORT || 4000,
  db_host: process.env.POSTGRES_HOST || "localhost",
  db_port: Number(process.env.POSTGRES_PORT) || 5432,
  db_user: process.env.POSTGRES_USER || "postgres",
  db_password: process.env.POSTGRES_PASSWORD || "postgres",
  db_name: process.env.POSTGRES_DB || "test",
  supabaseUrl: process.env.SUPABASE_URL || "https://example.supabase.co",
  supabaseKey: process.env.SUPABASE_PK || "example-key",
  jwtSecret: process.env.SUPABASE_AUTH_JWT_SECRET || "super-secret-key-that-should-be-replaced"
};
