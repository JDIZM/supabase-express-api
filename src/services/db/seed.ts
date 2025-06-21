import { seedAccounts } from "./seeds/accounts.ts";
import { logger } from "../../helpers/index.ts";
import { signUpWithSupabase } from "@/handlers/auth/auth.handlers.ts";

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
  // Unless you add them manually and check auto confirm;
  // Seed users created on the local db will be auto confirmed.
  if (options?.supabase === "true") {
    logger.info("Seeding accounts with Supabase user creation...");
    await seedAccounts(true, signUpWithSupabase);
    return;
  }

  logger.info("Seeding accounts locally only...");
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
