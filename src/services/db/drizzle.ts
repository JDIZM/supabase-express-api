import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../../config.ts";
import { logger } from "@/helpers/index.ts";
import * as schema from "../../schema.ts";

const client = new pg.Client({
  host: config.db_host,
  port: config.db_port,
  user: config.db_user,
  password: config.db_password,
  database: config.db_name
});

client
  .connect()
  .then(() => {
    logger.info("connected to database");
  })
  .catch((err) => {
    logger.error({ msg: "database connection error", error: err });
    process.exit(1);
  });

export const db = drizzle(client, { schema });
