import type { Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { accounts, uuidSchema, type AccountSelectType, type AccountWithRelations } from "@/schema.ts";
import { createDbAccount, getAccountWithRelations } from "./accounts.methods.ts";

export async function getAccounts(_req: Request, res: Response): Promise<void> {
  const result = await db.select().from(accounts).execute();

  logger.info({ msg: `Fetched accounts: ${result.length}` });

  const response = gatewayResponse<AccountSelectType[]>().success(200, result);

  res.status(response.code).send(response);
}

export async function getAccount(req: Request, res: Response): Promise<void> {
  uuidSchema.parse({ uuid: req.params.id });

  if (!req.params.id) {
    throw new Error("UUID is required");
  }

  const result = await getAccountWithRelations(req.params.id);

  if (!result) {
    throw new Error("Account not found");
  }

  logger.info({ msg: `Fetched account with UUID ${req.params.id}` });

  const response = gatewayResponse<AccountWithRelations>().success(200, result);

  res.status(response.code).send(response);
}

export async function createAccount(req: Request, res: Response): Promise<void> {
  const { fullName, phone, email } = req.body;

  logger.info({ msg: `Creating account...` });

  const accountId = await createDbAccount({ fullName, phone, email });

  const response = gatewayResponse<string>().success(200, accountId);

  res.status(response.code).send(response);
}

export async function updateAccount(_req: Request, res: Response): Promise<void> {
  res.status(200).send("updated account");
}
