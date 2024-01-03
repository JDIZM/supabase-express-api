import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../../config.ts";

const client = new pg.Client({
  host: config.db_host,
  port: 5432,
  user: config.db_user,
  password: config.db_password,
  database: config.db_name
});

await client.connect();

export const db = drizzle(client);
