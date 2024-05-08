import { seedUsers } from "./seeds/users.ts";
import { logger } from "../../helpers/logger.ts";

async function main(): Promise<void> {
  logger.info("Seeding users...");

  const args = process.argv.slice(2);

  const options = args
    .map((str) => str.replace(/^-+/, "").split("="))
    .reduce<{ [key: string]: string }>((acc, curr) => {
      const [key, value] = curr;

      if (!key || !value) return acc;

      acc[key] = value;

      return acc;
    }, {});

  // Note if you are using supabase you will need to confirm the email addresses.
  if (options?.supabase) {
    logger.info("Seeding users with supabase...");
    const ids = await seedUsers(true);
    logger.info("Created users with ids:", ids);
    return;
  }

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
