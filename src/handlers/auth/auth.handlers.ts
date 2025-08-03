import { supabase } from "@/services/supabase.ts";
import type { NextFunction, Request, Response } from "express";
import { logger, gatewayResponse } from "@/helpers/index.ts";
import { createDbAccount } from "@/handlers/accounts/accounts.methods.ts";
import type { User } from "@supabase/supabase-js";
import { asyncHandler } from "@/helpers/request.ts";
import { LoginRequestSchema, SignupRequestSchema } from "@/docs/openapi-schemas.ts";
import { HttpErrors, handleHttpError } from "@/helpers/HttpError.ts";

export const signUpWithSupabase = async (email: string, password: string): Promise<User | Error> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error || !data?.user) {
    logger.error({ error }, "Unable to sign up with Supabase");
    return new Error("Unable to sign up", {
      cause: error
    });
  }

  return data.user;
};

export const signUp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validation = SignupRequestSchema.safeParse(req.body);
  if (!validation.success) {
    handleHttpError(
      HttpErrors.ValidationFailed(`Invalid request data: ${validation.error.message}`),
      res,
      gatewayResponse
    );
    return;
  }

  const { email, password, fullName, phone } = validation.data;

  const user = await signUpWithSupabase(email, password);

  if (!user || user instanceof Error) {
    // Don't expose the original error to the client. This is a security risk.
    // eg "code": "user_already_exists"
    // We also don't want to throw errors in the handler, because they will be caught by the asyncHandler and reported to Sentry.
    const response = gatewayResponse<string>().error(401, Error("Unable to sign up"), "Unable to sign up");
    res.status(response.code).send(response);
    return;
  }

  logger.info({ msg: `User signed up with id: ${user.id}` });

  // Let Supabase provide us the UUID for the account.
  const dbAccountId = await createDbAccount({ email, fullName, phone, uuid: user.id });

  const response = gatewayResponse<string>().success(200, `Account created in DB with id: ${dbAccountId}`);

  res.status(response.code).send(response);
});

export const signInWithPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validation = LoginRequestSchema.safeParse(req.body);
      if (!validation.success) {
        handleHttpError(
          HttpErrors.ValidationFailed(`Invalid request data: ${validation.error.message}`),
          res,
          gatewayResponse
        );
        return;
      }

      const { email, password } = validation.data;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Don't expose the original error to the client. This is a security risk.
        // We also don't want to throw errors in the handler, because they will be caught by the asyncHandler and reported to Sentry.
        logger.error({ error }, "Unable to signInWithPassword");
        const response = gatewayResponse<string>().error(401, Error("Unable to sign in"), "Unable to sign in");
        res.status(response.code).send(response);
        return;
      }

      logger.info("User signed in", 200, data.user.id);
      const response = gatewayResponse<typeof data>().success(200, data);

      res.status(response.code).send(response);
    } catch (err) {
      next(err);
    }
  }
);
