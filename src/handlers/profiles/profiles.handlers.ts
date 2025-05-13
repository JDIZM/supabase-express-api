import { gatewayResponse, logger } from "@/helpers/index.ts";
import { profiles, profileInsertSchema } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { getProfilesByAccountId } from "./profiles.methods.ts";
import { asyncHandler } from "@/helpers/request.ts";

export const getProfiles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req;
    logger.info(`Fetching profiles for account: ${accountId}`);

    if (!accountId) {
      throw new Error("Account id is required");
    }

    logger.info({ msg: `Fetching profiles for account: ${accountId}` });

    const result = await getProfilesByAccountId(accountId);

    const response = gatewayResponse().success(200, result, `Fetched profiles for account: ${accountId}`);

    res.status(response.code).send(response);
    return;
  } catch (err) {
    const response = gatewayResponse().error(400, err as Error, "Unable to fetch profiles for account");

    res.status(response.code).send(response);
    return;
  }
});

// @ts-expect-error no-unused-parameter
export const getAllProfiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.select().from(profiles).execute();

    logger.info({ msg: `Fetching profiles: ${result.length}` });

    const response = gatewayResponse().success(200, result, "Fetched profiles");

    res.status(response.code).send(response);
    return;
  } catch (err) {
    const response = gatewayResponse().error(400, err as Error, "Unable to fetch all profiles");

    res.status(response.code).send(response);
    return;
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.params.id) {
      throw new Error("Profile id is required");
    }

    logger.info({ msg: `Fetching profile: ${req.params.id}` });

    const equals = eq(profiles.uuid, req.params.id);

    const profile = await db.select().from(profiles).where(equals).execute();

    const response = gatewayResponse().success(200, profile, "Fetched profile");

    res.status(response.code).send(response);
    return;
  } catch (err) {
    const response = gatewayResponse().error(400, err as Error, "Unable to fetch profile");

    res.status(response.code).send(response);
    return;
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.params.id) {
      throw new Error("Profile id is required");
    }

    profileInsertSchema.parse(req.body);

    const equals = eq(profiles.uuid, req.params.id);

    const result = await db.update(profiles).set(req.body).where(equals).execute();

    logger.info({ msg: `Updating profile: ${req.params.id}` });

    const response = gatewayResponse().success(200, result, "Updated profile");

    res.status(response.code).send(response);
    return;
  } catch (err) {
    const response = gatewayResponse().error(400, err as Error, "Unable to update profile");

    res.status(response.code).send(response);
    return;
  }
};
