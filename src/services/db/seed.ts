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

  // Supabase Integration Notes:
  // - For database structure testing only: Run without --supabase=true
  // - For full authentication testing: Use --supabase=true (requires email confirmation)
  // - Email confirmation: Set "Enable email confirmations" to OFF in Supabase Auth settings
  //   OR manually confirm users in Supabase dashboard after seeding
  // - Local-only accounts work for API testing but cannot login through auth endpoints
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
