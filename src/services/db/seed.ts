import { seedAccounts } from "./seeds/accounts.ts";
import { logger } from "../../helpers/index.ts";

async function main(): Promise<void> {
  logger.info("Seeding accounts...");

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
    // TODO create accounts with supabase.
    // logger.info("Seeding users with supabase...");
    // await seedAccounts(true);
    return;
  }

  await seedAccounts();
}

try {
  logger.info("Seeding database...");
  await main();
  process.exit(0);
} catch (err) {
  logger.error({ msg: "Error seeding database", error: err });
  process.exit(1);
}
