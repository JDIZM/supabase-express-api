import { gatewayResponse, logger } from "@/helpers/index.ts";
import { profiles, profileInsertSchema } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { getProfilesByAccountId } from "./profiles.methods.ts";

// @ts-expect-error no-unused-parameter
export async function getProfiles(req: Request, res: Response) {
  try {
    const { account } = res.locals;

    const accountId = account?.uuid;

    if (!accountId) {
      throw new Error("Account id is required");
    }

    logger.info({ msg: `Fetching profiles for account: ${accountId}` });

    const result = await getProfilesByAccountId(accountId);

    const response = gatewayResponse().success(200, result, "Fetched profiles for account");

    return res.status(response.code).send(response);
  } catch (err) {
    const error = err as Error;

    logger.error({ msg: "Unable to fetch profiles for account", error });

    const response = gatewayResponse().error(400, error, error.message);

    return res.status(response.code).send(response);
  }
}

// @ts-expect-error no-unused-parameter
export async function getAllProfiles(req: Request, res: Response) {
  try {
    const result = await db.select().from(profiles).execute();

    logger.info({ msg: `Fetching profiles: ${result.length}` });

    const response = gatewayResponse().success(200, result, "Fetched profiles");

    return res.status(response.code).send(response);
  } catch (err) {
    const error = err as Error;

    logger.error({ msg: "Unable to fetch all profiles", error });

    const response = gatewayResponse().error(400, error, error.message);

    return res.status(response.code).send(response);
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    if (!req.params.id) {
      throw new Error("Profile id is required");
    }

    logger.info({ msg: `Fetching profile: ${req.params.id}` });

    const equals = eq(profiles.uuid, req.params.id);

    const profile = await db.select().from(profiles).where(equals).execute();

    const response = gatewayResponse().success(200, profile, "Fetched profile");

    return res.status(response.code).send(response);
  } catch (err) {
    const error = err as Error;

    logger.error({ msg: "Unable to fetch profile", error });

    const response = gatewayResponse().error(400, error, error.message);

    return res.status(response.code).send(response);
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    if (!req.params.id) {
      throw new Error("Profile id is required");
    }

    profileInsertSchema.parse(req.body);

    const equals = eq(profiles.uuid, req.params.id);

    const result = await db.update(profiles).set(req.body).where(equals).execute();

    logger.info({ msg: `Updating profile: ${req.params.id}` });

    const response = gatewayResponse().success(200, result, "Updated profile");

    return res.status(response.code).send(response);
  } catch (err) {
    const error = err as Error;

    logger.error({ msg: "Unable to update profile", error });

    const response = gatewayResponse().error(400, error, error.message);

    return res.status(response.code).send(response);
  }
}
