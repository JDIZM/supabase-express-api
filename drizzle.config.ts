import type { Config } from "drizzle-kit";
// drizzle requires the ts extension to import config.
import { config } from "./src/config.ts";
import { logger } from "./src/helpers/index.ts";

logger.info({ msg: "config", config });

export default {
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    host: config.db_host,
    user: config.db_user,
    port: 5432,
    password: config.db_password,
    database: config.db_name,
    ssl: config.env !== "dev"
  }
} satisfies Config;
