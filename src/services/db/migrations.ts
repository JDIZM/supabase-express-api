import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./drizzle.ts";

// this will automatically run needed migrations on the database
// https://tone-row.com/blog/drizzle-orm-quickstart-tutorial-first-impressions
migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => {
    console.log("Migrations complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migrations failed!", err);
    process.exit(1);
  });
