import { HttpErrors, handleHttpError } from "@/helpers/HttpError.ts";
import { gatewayResponse, logger } from "@/helpers/index.ts";
import { asyncHandler } from "@/helpers/request.ts";
import { accounts, uuidSchema, type AccountSelectType, type AccountWithRelations } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import type { Request, Response } from "express";
import { createDbAccount, getAccountWithRelations } from "./accounts.methods.ts";

export const getAccounts = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const result = await db.select().from(accounts).execute();

  logger.info({ msg: `Fetched accounts: ${result.length}` });

  const response = gatewayResponse<AccountSelectType[]>().success(200, result);

  res.status(response.code).send(response);
});

export const getAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validationResult = uuidSchema.safeParse({ uuid: req.params.id });
  if (!validationResult.success) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Invalid account ID: ${validationResult.error.message}`),
      res,
      gatewayResponse
    );
    return;
  }

  if (!req.params.id) {
    handleHttpError(HttpErrors.MissingParameter("Account ID"), res, gatewayResponse);
    return;
  }

  const result = await getAccountWithRelations(req.params.id);

  if (!result) {
    handleHttpError(HttpErrors.AccountNotFound(), res, gatewayResponse);
    return;
  }

  logger.info({ msg: `Fetched account with UUID ${req.params.id}` });

  const response = gatewayResponse<AccountWithRelations>().success(200, result);

  res.status(response.code).send(response);
});

export const createAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { fullName, phone, email } = req.body;

  logger.info({ msg: `Creating account...` });

  const accountId = await createDbAccount({ fullName, phone, email });

  const response = gatewayResponse<string>().success(200, accountId);

  res.status(response.code).send(response);
});

export const updateAccount = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).send("updated account");
});
