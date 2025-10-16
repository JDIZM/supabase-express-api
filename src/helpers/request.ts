import type { NextFunction, Request, Response } from "express";

/**
 * Extract IP address from request headers
 * Handles various proxy headers and formats
 */
export function getIpFromRequest(req: Request): string | undefined {
  const ips =
    req.headers["cf-connecting-ip"] ?? req.headers["x-real-ip"] ?? req.headers["x-forwarded-for"] ?? req.ip ?? "";

  const result = ips instanceof Array ? ips : ips.split(",");
  return result[0]?.trim();
}

// An async handler that passes any error to the next function
// to be handled by global middleware.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
