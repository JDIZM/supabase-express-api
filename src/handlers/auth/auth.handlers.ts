import { supabase } from "@/services/supabase.ts";
import type { Request, Response } from "express";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { createDbAccount } from "@/handlers/accounts/accounts.handlers.ts";

export const signUpWithSupabase = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    logger.error("signUpWithSupabase error", error);
    return null;
  }

  return data.user;
};

export const signUp = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone } = req.body;

    const user = await signUpWithSupabase(email, password);

    if (!user) {
      logger.error("Unable to sign up", 400);
      const response = gatewayResponse().error(400, new Error("Unable to sign up"), "Unable to sign up");

      return res.status(response.code).send(response);
    }

    logger.info("User signed up", 200, user.id);

    const dbAccount = await createDbAccount({ email, fullName, phone, uuid: user.id });
    logger.info("Account created in DB", 200, dbAccount);

    const response = gatewayResponse().success(200, user);

    return res.status(response.code).send(response);
  } catch (err) {
    if (err instanceof Error) {
      logger.error("Unable to sign up", 400, err);
      const response = gatewayResponse().error(400, err, "Unable to sign up");

      return res.status(response.code).send(response);
    }

    logger.error("Unable to sign up", 500, err);
    const response = gatewayResponse().error(500, Error("Internal server error"), "Unable to sign up");

    return res.status(response.code).send(response);
  }
};

export const signInWithPassword = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    const response = gatewayResponse().error(400, error, "Unable to sign in with password");
    logger.error("Unable to sign in with password", error);

    return res.status(response.code).send(response);
  }

  logger.info("User signed in", 200, data.user.id);
  const response = gatewayResponse().success(200, data);

  return res.status(response.code).send(response);
};
