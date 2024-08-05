import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { accounts, uuidSchema } from "@/schema.ts";
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
    const response = gatewayResponse().error(400, err as Error, "Unable to fetch accounts");

    res.status(response.code).send(response);
  }
}

export async function getAccount(req: Request, res: Response) {
  try {
    uuidSchema.parse({ uuid: req.params.id });

    if (!req.params.id) {
      throw new Error("UUID is required");
    }

    const equals = eq(accounts.uuid, req.params.id);

    const result = await db.query.accounts.findFirst({
      where: equals,
      with: {
        workspaces: true,
        profiles: {
          columns: {
            uuid: true,
            name: true,
            workspaceId: true
          }
        }
      }
    });

    logger.info({ msg: `Fetched account with UUID ${req.params.id}` });

    const response = gatewayResponse<typeof result>().success(200, result);

    return res.status(response.code).send(response);
  } catch (err) {
    const response = gatewayResponse().error(400, err as Error, "Unable to fetch account");

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
    const response = gatewayResponse().error(400, err as Error, "Unable to create account");

    return res.status(response.code).send(response);
  }
}

// @ts-expect-error no-unused-parameters
export async function updateAccount(req: Request, res: Response) {
  return res.status(200).send("updated account");
}
