import { gatewayResponse, logger } from "@/helpers/index.ts";
import { profiles, profileInsertSchema } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

// @ts-expect-error no-unused-parameter
export async function getProfiles(req: Request, res: Response) {
  try {
    const result = await db.select().from(profiles).execute();

    logger.info("fetching profiles", result);

    const response = gatewayResponse().success(200, result, "Fetched profiles");

    return res.status(response.code).send(response);
  } catch (err) {
    logger.error("Unable to fetch profiles", err);

    const response = gatewayResponse().error(500, Error("Unable to fetch profiles"), "Unable to fetch profiles");

    return res.status(response.code).send(response);
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    if (!req.params.id) {
      throw new Error("Profile id is required");
    }

    const equals = eq(profiles.uuid, req.params.id);
    const profile = await db.select().from(profiles).where(equals).execute();

    logger.info("fetching profile", profile);

    const response = gatewayResponse().success(200, profile, "Fetched profile");

    return res.status(response.code).send(response);
  } catch (err) {
    logger.error("Unable to fetch profile", err);

    const response = gatewayResponse().error(500, Error("Unable to fetch profile"), "Unable to fetch profile");

    return res.status(response.code).send(response);
  }
}

export async function createProfile(req: Request, res: Response) {
  try {
    profileInsertSchema.parse(req.body);

    const result = await db.insert(profiles).values(req.body).execute();

    logger.info("creating profile", result);

    const response = gatewayResponse().success(201, result, "Created profile");

    return res.status(response.code).send(response);
  } catch (err) {
    logger.error("Unable to create profile", err);

    const response = gatewayResponse().error(500, Error("Unable to create profile"), "Unable to create profile");

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

    logger.info("updating profile", result);

    const response = gatewayResponse().success(200, result, "Updated profile");

    return res.status(response.code).send(response);
  } catch (err) {
    logger.error("Unable to update profile", err);

    const response = gatewayResponse().error(500, Error("Unable to update profile"), "Unable to update profile");

    return res.status(response.code).send(response);
  }
}
