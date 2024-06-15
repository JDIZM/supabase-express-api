import { gatewayResponse, logger } from "@/helpers/index.ts";
import { profiles, profileInsertSchema } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

// @ts-expect-error no-unused-parameter
export async function getAllProfiles(req: Request, res: Response) {
  try {
    const result = await db.select().from(profiles).execute();

    logger.info({ msg: `Fetching profiles: ${result.length}` });

    const response = gatewayResponse().success(200, result, "Fetched profiles");

    return res.status(response.code).send(response);
  } catch (err) {
    const message = "Unable to fetch all profiles";

    logger.error({ msg: message, err });

    const response = gatewayResponse().error(500, Error(message), message);

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
    const message = "Unable to fetch profile";

    logger.error({ msg: message, err });

    const response = gatewayResponse().error(500, Error(message), message);

    return res.status(response.code).send(response);
  }
}

export async function createProfile(req: Request, res: Response) {
  try {
    profileInsertSchema.parse(req.body);

    logger.info({ msg: "Creating profile" });

    const result = await db.insert(profiles).values(req.body).returning();

    logger.info({ msg: `Created profile: ${result[0]?.uuid}` });

    const response = gatewayResponse().success(201, result, "Created profile");

    return res.status(response.code).send(response);
  } catch (err) {
    logger.error({ msg: "Unable to create profile", err });

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

    logger.info({ msg: `Updating profile: ${req.params.id}` });

    const response = gatewayResponse().success(200, result, "Updated profile");

    return res.status(response.code).send(response);
  } catch (err) {
    logger.error("Unable to update profile", err);

    const response = gatewayResponse().error(500, Error("Unable to update profile"), "Unable to update profile");

    return res.status(response.code).send(response);
  }
}
