import { seedUsers } from "./seeds/users.ts";

async function main(): Promise<void> {
  console.log("Seeding users...");
  const ids = await seedUsers();
  console.log("Created users with ids:", ids);
}

try {
  console.log("Seeding database...");
  await main();
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
