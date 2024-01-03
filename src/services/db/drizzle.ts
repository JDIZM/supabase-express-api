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

client
  .connect()
  .then(() => {
    console.log("connected");
  })
  .catch((err) => {
    console.error("connection error", err);
    process.exit(1);
  });

export const db = drizzle(client);
