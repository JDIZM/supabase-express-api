import { PrismaClient } from "@prisma/client";
import { seedUsers } from "./users.js";
const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("Seeding users...");
  await seedUsers();
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
