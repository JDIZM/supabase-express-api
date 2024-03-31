import { seedUsers } from "./seeds/users.ts";
import { logger } from "../../helpers/logger.ts";

async function main(): Promise<void> {
  logger.info("Seeding users...");
  const ids = await seedUsers();
  logger.info("Created users with ids:", ids);
}

try {
  logger.info("Seeding database...");
  await main();
  process.exit(0);
} catch (err) {
  logger.error("error seeding database...", err);
  process.exit(1);
}
