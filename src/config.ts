import dotenv from "dotenv";
import { logger } from "@/helpers/index.ts";

export const stages = ["dev", "prod"] as const;

export const ENV = (process.env.NODE_ENV as Stage) ?? ("dev" as Stage);

export type Stage = (typeof stages)[number];

export const getStage = () => {
  if (!stages.includes(ENV)) {
    logger.error(`Invalid environment: ${ENV}`);
    throw new Error(`Invalid environment: ${ENV}`);
  }
  return ENV;
};

export const STAGE = getStage();

logger.info(`running in env: ${STAGE}`);

if (STAGE === "dev") {
  dotenv.config();
}

export const config = {
  env: STAGE,
  port: process.env.PORT || 3000,
  db_host: process.env.POSTGRES_HOST || "localhost",
  db_user: process.env.POSTGRES_USER || "postgres",
  db_password: process.env.POSTGRES_PASSWORD || "postgres",
  db_name: process.env.POSTGRES_DB || "test",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  supabaseUrl: process.env.SUPABASE_URL || "https://example.supabase.co",
  supabaseKey: process.env.SUPABASE_PK || "example-key"
};
