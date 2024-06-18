import { supabase } from "@/services/supabase.ts";
import type { Request, Response } from "express";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { createDbAccount } from "@/handlers/accounts/accounts.methods.ts";

export const signUpWithSupabase = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    logger.error({ msg: "Unable to sign up", err: error });
    return null;
  }

  return data.user;
};

export const signUp = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone } = req.body;

    const user = await signUpWithSupabase(email, password);

    if (!user) {
      logger.error({ msg: "Unable to sign up" });

      const response = gatewayResponse().error(400, new Error("Unable to sign up"), "Unable to sign up");

      return res.status(response.code).send(response);
    }

    logger.info("User signed up", 200, user.id);

    const dbAccount = await createDbAccount({ email, fullName, phone, uuid: user.id });
    logger.info({ msg: `Account created in DB with id: ${dbAccount}` });

    const response = gatewayResponse().success(200, user);

    return res.status(response.code).send(response);
  } catch (err) {
    const error = err as Error;

    const message = "Unable to sign up";

    logger.error({ msg: message, err });

    const response = gatewayResponse().error(400, error, error.message);

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
