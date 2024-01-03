import { Request, Response } from "express";
import { db } from "@/services/db/drizzle.js";
import { users } from "@/schema.js";

async function fetchUsers() {
  const result = await db.select().from(users).execute();
  return result;
}

export async function getUsers(req: Request, res: Response) {
  const response = await fetchUsers();

  await res.status(200).send(response);
}
