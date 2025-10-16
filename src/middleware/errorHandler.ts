import * as Sentry from "@sentry/node";
import type { NextFunction, Request, Response } from "express";
import { HttpStatusCode } from "@/helpers/Http.ts";
import { apiResponse } from "@/helpers/response.ts";

// Global error handling middleware.
export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  Sentry.captureException(err);

  const response = apiResponse.error(err, HttpStatusCode.INTERNAL_SERVER_ERROR);

  res.status(response.code).send(response);
};
