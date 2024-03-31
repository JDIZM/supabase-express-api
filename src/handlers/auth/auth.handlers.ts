import { supabase } from "@/services/supabase.ts";
import { Request, Response } from "express";
import { gatewayResponse } from "@/helpers/response.ts";
import { logger } from "@/helpers/logger.ts";

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
