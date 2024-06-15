import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { accounts, accountSelectSchema, accountInsertSchema, uuidSchema } from "@/schema.ts";
import { eq } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

// @ts-expect-error no-unused-parameters
export async function getAccounts(req: Request, res: Response) {
  try {
    const result = await db.select().from(accounts).execute();

    logger.info("Fetched accounts", 200);
    const response = gatewayResponse<typeof result>().success(200, result);

    return res.status(response.code).send(response);
  } catch (err) {
    if (err instanceof Error) {
      logger.error("Unable to fetch accounts", 500, err);
      const response = gatewayResponse().error(500, err, "Unable to fetch accounts");

      return res.status(response.code).send(response);
    }

    logger.error("Unable to fetch accounts", 500, err);
    const response = gatewayResponse().error(500, Error("Internal server error"), "Unable to fetch accounts");

    res.status(response.code).send(response);
  }
}

export async function getAccount(req: Request, res: Response) {
  try {
    // Throw error if the UUID is invalid.
    uuidSchema.parse({ uuid: req.params.id });

    if (!req.params.id) {
      throw new Error("UUID is required");
    }

    // Fetch result from DB.
    const equals = eq(accounts.uuid, req.params.id);
    const result = await db.select().from(accounts).where(equals).execute();

    // Validate response with zod without throwing error.
    const parsedAccount = accountSelectSchema.safeParse(result[0]);

    if (!parsedAccount.success) {
      logger.error("Unable to fetch account", 400, parsedAccount.error);
      const response = gatewayResponse().error(400, parsedAccount.error, "Unable to fetch account");

      return res.status(response.code).send(response);
    }

    logger.info("Fetched account", 200, req.params.id);
    const response = gatewayResponse<typeof parsedAccount.data>().success(200, parsedAccount.data);

    return res.status(response.code).send(response);
  } catch (err) {
    if (err instanceof Error) {
      logger.error("Unable to fetch account", 500, err);
      const response = gatewayResponse().error(500, err, "Unable to fetch account");

      return res.status(response.code).send(response);
    }

    logger.error("Unable to fetch account", 500, err);
    const response = gatewayResponse().error(500, Error("Internal server error"), "Unable to fetch account");

    return res.status(response.code).send(response);
  }
}

export async function createDbAccount(account: InferInsertModel<typeof accounts>) {
  accountInsertSchema.parse(account);

  const response = await db.insert(accounts).values(account).returning();

  const result = response[0];

  if (!result) {
    throw new Error("Unable to create account");
  }

  logger.debug("created account: ", result.uuid);

  return result.uuid;
}

export async function createAccount(req: Request, res: Response) {
  try {
    const { fullName, phone, email } = req.body;

    const accountId = await createDbAccount({ fullName, phone, email });

    logger.info("Account created", 200, accountId);
    const response = gatewayResponse().success(200, accountId);

    return res.status(response.code).send(response);
  } catch (err) {
    if (err instanceof Error) {
      logger.error("Unable to create account", 400, err);
      const response = gatewayResponse().error(400, err, "Unable to create account");

      return res.status(response.code).send(response);
    }

    logger.error("Unable to create account", 500, err);
    const response = gatewayResponse().error(500, Error("Unable to create account"), "Unable to create account");

    return res.status(response.code).send(response);
  }
}

// @ts-expect-error no-unused-parameters
export async function updateAccount(req: Request, res: Response) {
  await res.status(200).send("updated account");
}
