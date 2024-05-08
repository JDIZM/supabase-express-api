import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.js";
import { gatewayResponse } from "@/helpers/response.ts";
import { logger } from "@/helpers/logger.ts";
import { users, selectUserSchema, insertUserSchema, uuidSchema } from "@/schema.js";
import { eq } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

export async function getUsers(req: Request, res: Response) {
  try {
    const result = await db.select().from(users).execute();

    logger.info("Fetched users", 200);
    const response = gatewayResponse<typeof result>().success(200, result);

    return res.status(response.code).send(response);
  } catch (err) {
    if (err instanceof Error) {
      logger.error("Unable to fetch users", 500, err);
      const response = gatewayResponse().error(500, err, "Unable to fetch users");

      return res.status(response.code).send(response);
    }

    logger.error("Unable to fetch users", 500, err);
    const response = gatewayResponse().error(500, Error("Internal server error"), "Unable to fetch users");

    return res.status(response.code).send(response);
  }
}

// TODO add relations with includes query params to user.
export async function getUser(req: Request, res: Response) {
  try {
    // Throw error if the UUID is invalid.
    uuidSchema.parse({ uuid: req.params.id });

    if (!req.params.id) {
      throw new Error("UUID is required");
    }

    // Fetch result from DB.
    const equals = eq(users.uuid, req.params.id);
    const result = await db.select().from(users).where(equals).execute();

    // Validate response with zod without throwing error.
    const parsedUser = selectUserSchema.safeParse(result[0]);

    if (!parsedUser.success) {
      logger.error("Unable to fetch user", 400, parsedUser.error);
      const response = gatewayResponse().error(400, parsedUser.error, "Unable to fetch user");

      return res.status(response.code).send(response);
    }

    logger.info("Fetched user", 200, req.params.id);
    const response = gatewayResponse<typeof parsedUser.data>().success(200, parsedUser.data);

    return res.status(response.code).send(response);
  } catch (err) {
    if (err instanceof Error) {
      logger.error("Unable to fetch user", 500, err);
      const response = gatewayResponse().error(500, err, "Unable to fetch user");

      return res.status(response.code).send(response);
    }

    logger.error("Unable to fetch user", 500, err);
    const response = gatewayResponse().error(500, Error("Internal server error"), "Unable to fetch user");

    return res.status(response.code).send(response);
  }
}

export async function createDbUser(user: InferInsertModel<typeof users>) {
  insertUserSchema.parse(user);

  const response = await db.insert(users).values(user).returning();

  const result = response[0];

  if (!result) {
    throw new Error("Unable to create user");
  }

  logger.debug("created user: ", result.uuid);

  return result.uuid;
}

export async function createUser(req: Request, res: Response) {
  try {
    const { fullName, phone, email } = req.body;
    const role = "user";

    const userId = await createDbUser({ fullName, phone, email, role });

    logger.info("User created", 200, userId);
    const response = gatewayResponse().success(200, userId);

    return res.status(response.code).send(response);
  } catch (err) {
    if (err instanceof Error) {
      logger.error("Unable to create user", 400, err);
      const response = gatewayResponse().error(400, err, "Unable to create user");

      return res.status(response.code).send(response);
    }

    logger.error("Unable to create user", 500, err);
    const response = gatewayResponse().error(500, Error("Unable to create user"), "Unable to create user");

    return res.status(response.code).send(response);
  }
}

export async function updateUser(req: Request, res: Response) {
  await res.status(200).send("updated user");
}
