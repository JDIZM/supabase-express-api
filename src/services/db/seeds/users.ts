import { db } from "@/services/db/drizzle.js";
import { users } from "@/schema.js";
import { signUpWithSupabase } from "@/handlers/auth/auth.handlers.ts";
import { InferInsertModel } from "drizzle-orm";
import { logger } from "@/helpers/logger.ts";

const usersArray: InferInsertModel<typeof users>[] = [
  {
    uuid: "00000000-0000-0000-0000-000000000000",
    fullName: "John Doe",
    phone: "555-555-5555",
    email: "john.doe@example.com",
    role: "admin"
  },
  {
    uuid: "00000000-0000-0000-0000-000000000001",
    fullName: "Jane Doe",
    phone: "555-555-5555",
    email: "jane.doe@example.com",
    role: "user"
  }
];

async function createUser(user: InferInsertModel<typeof users>) {
  const response = await db.insert(users).values(user).returning();
  logger.debug("created user: ", response);
  // we know that the response will be an array of one element
  return response[0].uuid;
}

export async function seedUsers(isSupabase = false) {
  if (isSupabase) {
    const users = await Promise.all(usersArray.map((user) => signUpWithSupabase(user.email, "example-password")));
    logger.debug("signed up users and created uuids", users);

    users.forEach((user, index) => {
      if (user) {
        usersArray[index].uuid = user.id;
      }
    });
  }

  return Promise.all(usersArray.map((user) => createUser(user)));
}
