import { Request, Response } from "express";
import { db } from "@/services/db/drizzle.js";
import { users, selectUserSchema, uuidSchema } from "@/schema.js";
import { eq } from "drizzle-orm";

async function fetchUsers() {
  const result = await db.select().from(users).execute();
  return result;
}

export async function getUsers(req: Request, res: Response) {
  const response = await fetchUsers();

  await res.status(200).send(response);
}

// TODO create additional endpoints for CRUD users with zod validation.
export async function getUser(req: Request, res: Response) {
  try {
    // Throw error if the UUID is invalid
    uuidSchema.parse({ uuid: req.params.id });

    // Fetch result from DB
    const result = await db.select().from(users).where(eq(users.uuid, req.params.id)).execute();
    console.log("result", result);

    // Validate response with zod without throwing error
    const parsedUser = selectUserSchema.safeParse(result[0]);
    if (!parsedUser.success) console.error(parsedUser.error);

    await res.status(200).send(result);
  } catch (err) {
    console.error(err);
    await res.status(500).send({
      message: "unable to fetch user",
      error: err
    });
  }
}

export async function createUser(req: Request, res: Response) {
  // const response = await fetchUsers();

  await res.status(200).send("created user");
}

export async function updateUser(req: Request, res: Response) {
  // const response = await fetchUsers();

  await res.status(200).send("updated user");
}
