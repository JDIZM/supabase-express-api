import type { Config } from "drizzle-kit";
// drizzle requires the ts extension to import config.
import { config } from "./src/config.ts";

console.log("config", config);

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    host: config.db_host,
    user: config.db_user,
    port: 5432,
    password: config.db_password,
    database: config.db_name
  }
} satisfies Config;
