import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { accounts, accountSelectSchema, uuidSchema } from "@/schema.ts";
import { eq } from "drizzle-orm";
import { createDbAccount } from "./accounts.methods.ts";

// @ts-expect-error no-unused-parameters
export async function getAccounts(req: Request, res: Response) {
  try {
    const result = await db.select().from(accounts).execute();

    logger.info({ msg: `Fetched accounts: ${result.length}` });

    const response = gatewayResponse<typeof result>().success(200, result);

    return res.status(response.code).send(response);
  } catch (err) {
    const message = "Unable to fetch accounts";

    logger.error({ msg: message, err });

    const response = gatewayResponse().error(500, Error(message), message);

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
      logger.error({ msg: "Unable to fetch account", error: parsedAccount.error });

      const response = gatewayResponse().error(400, parsedAccount.error, "Unable to fetch account");

      return res.status(response.code).send(response);
    }

    logger.info({ msg: `Fetched account with UUID ${req.params.id}` });

    const response = gatewayResponse<typeof parsedAccount.data>().success(200, parsedAccount.data);

    return res.status(response.code).send(response);
  } catch (err) {
    const message = "Unable to fetch account";

    logger.error({ msg: message, err });

    const response = gatewayResponse().error(500, Error(message), message);

    return res.status(response.code).send(response);
  }
}

export async function createAccount(req: Request, res: Response) {
  try {
    const { fullName, phone, email } = req.body;

    logger.info({ msg: `Creating account...` });

    const accountId = await createDbAccount({ fullName, phone, email });

    const response = gatewayResponse().success(200, accountId);

    return res.status(response.code).send(response);
  } catch (err) {
    const message = "Unable to create account";

    logger.error({ msg: message, err });

    const response = gatewayResponse().error(500, Error(message), message);

    return res.status(response.code).send(response);
  }
}

// @ts-expect-error no-unused-parameters
export async function updateAccount(req: Request, res: Response) {
  await res.status(200).send("updated account");
}
