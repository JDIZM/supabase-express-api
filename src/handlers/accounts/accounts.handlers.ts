import { HttpErrors, HttpStatusCode } from "@/helpers/Http.ts";
import { asyncHandler } from "@/helpers/request.ts";
import { apiResponse } from "@/helpers/response.ts";
import { accounts, uuidSchema, type AccountSelectType, type AccountWithRelations } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import type { Request, Response } from "express";
import { createDbAccount, getAccountWithRelations } from "./accounts.methods.ts";

export const getAccounts = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const result = await db.select().from(accounts).execute();

  const response = apiResponse.success<AccountSelectType[]>(
    HttpStatusCode.OK,
    result,
    `Fetched accounts: ${result.length}`
  );

  res.status(response.code).send(response);
});

export const getAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validationResult = uuidSchema.safeParse({ uuid: req.params.id });

  if (!validationResult.success) {
    const response = apiResponse.error(
      HttpErrors.ValidationFailed(`Invalid account ID: ${validationResult.error.message}`)
    );
    res.status(response.code).send(response);
    return;
  }

  if (!req.params.id) {
    const response = apiResponse.error(HttpErrors.MissingParameter("Account ID"));
    res.status(response.code).send(response);
    return;
  }

  const result = await getAccountWithRelations(req.params.id);

  if (!result) {
    const response = apiResponse.error(HttpErrors.NotFound("Account"));
    res.status(response.code).send(response);
    return;
  }

  const response = apiResponse.success<AccountWithRelations>(
    HttpStatusCode.OK,
    result,
    `Fetched account with UUID ${req.params.id}`
  );
  res.status(response.code).send(response);
});

export const createAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { fullName, phone, email } = req.body;

  const accountId = await createDbAccount({ fullName, phone, email });

  const response = apiResponse.success<string>(HttpStatusCode.OK, accountId, "Account created");

  res.status(response.code).send(response);
});

export const updateAccount = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).send("updated account");
});
