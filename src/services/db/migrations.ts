import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./drizzle.ts";
import { logger } from "../../helpers/index.ts";

// this will automatically run needed migrations on the database
// https://tone-row.com/blog/drizzle-orm-quickstart-tutorial-first-impressions
migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => {
    logger.info("Migrations complete!");
    process.exit(0);
  })
  .catch((err) => {
    logger.error("Migrations failed!", err);
    process.exit(1);
  });
