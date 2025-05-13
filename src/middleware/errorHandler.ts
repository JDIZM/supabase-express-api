import * as Sentry from "@sentry/node";
import type { NextFunction, Request, Response } from "express";
import { gatewayResponse } from "@/helpers/index.ts";

// Global error handling middleware.
export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  Sentry.captureException(err);

  const response = gatewayResponse().error(500, err, err.message || "Internal Server Error");

  res.status(response.code).send(response);
};
