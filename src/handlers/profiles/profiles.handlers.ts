import { gatewayResponse, logger } from "@/helpers/index.ts";
import { profiles, profileInsertSchema } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { getProfilesByAccountId } from "./profiles.methods.ts";
import { asyncHandler } from "@/helpers/request.ts";
import { HttpErrors, handleHttpError } from "@/helpers/HttpError.ts";

export const getProfiles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { accountId } = req;
  logger.info(`Fetching profiles for account: ${accountId}`);

  if (!accountId) {
    handleHttpError(HttpErrors.MissingParameter("Account ID"), res, gatewayResponse);
    return;
  }

  logger.info({ msg: `Fetching profiles for account: ${accountId}` });

  const result = await getProfilesByAccountId(accountId);

  const response = gatewayResponse().success(200, result, `Fetched profiles for account: ${accountId}`);

  res.status(response.code).send(response);
});

export const getAllProfiles = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const result = await db.select().from(profiles).execute();

  logger.info({ msg: `Fetching profiles: ${result.length}` });

  const response = gatewayResponse().success(200, result, "Fetched profiles");

  res.status(response.code).send(response);
});

export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.params.id) {
    handleHttpError(HttpErrors.MissingParameter("Profile ID"), res, gatewayResponse);
    return;
  }

  logger.info({ msg: `Fetching profile: ${req.params.id}` });

  const equals = eq(profiles.uuid, req.params.id);

  const profile = await db.select().from(profiles).where(equals).execute();

  const response = gatewayResponse().success(200, profile, "Fetched profile");

  res.status(response.code).send(response);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.params.id) {
    handleHttpError(HttpErrors.MissingParameter("Profile ID"), res, gatewayResponse);
    return;
  }

  const validationResult = profileInsertSchema.safeParse(req.body);
  if (!validationResult.success) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Profile validation failed: ${validationResult.error.message}`),
      res,
      gatewayResponse
    );
    return;
  }

  const equals = eq(profiles.uuid, req.params.id);

  const result = await db.update(profiles).set(req.body).where(equals).execute();

  logger.info({ msg: `Updating profile: ${req.params.id}` });

  const response = gatewayResponse().success(200, result, "Updated profile");

  res.status(response.code).send(response);
});
