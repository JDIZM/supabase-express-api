import { Request, Response } from "express";
import { db } from "@/services/db/drizzle.js";
import { gatewayResponse } from "@/helpers/response.ts";
import { users, selectUserSchema, uuidSchema } from "@/schema.js";
import { eq } from "drizzle-orm";

export async function getUsers(req: Request, res: Response) {
  try {
    const result = await db.select().from(users).execute();

    const response = gatewayResponse().success(200, result);

    return res.status(response.code).send(response);
  } catch (error) {
    if (error instanceof Error) {
      const response = gatewayResponse().error(500, error, "Unable to fetch users");

      return res.status(response.code).send(response);
    }

    const response = gatewayResponse().error(500, Error("Internal server error"), "Unable to fetch users");

    return res.status(response.code).send(response);
  }
}

export async function getUser(req: Request, res: Response) {
  try {
    // Throw error if the UUID is invalid
    uuidSchema.parse({ uuid: req.params.id });

    // Fetch result from DB
    const result = await db.select().from(users).where(eq(users.uuid, req.params.id)).execute();

    // Validate response with zod without throwing error
    const parsedUser = selectUserSchema.safeParse(result[0]);

    if (!parsedUser.success) {
      console.error(parsedUser.error);
      const response = gatewayResponse().error(400, parsedUser.error, "Unable to fetch user");

      return res.status(response.code).send(response);
    }

    const response = gatewayResponse().success(200, parsedUser.data);

    return res.status(response.code).send(response);
  } catch (err) {
    if (err instanceof Error) {
      const response = gatewayResponse().error(500, err, "Unable to fetch user");

      return res.status(response.code).send(response);
    }

    const response = gatewayResponse().error(500, Error("Internal server error"), "Unable to fetch user");

    return res.status(response.code).send(response);
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
