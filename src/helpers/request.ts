import type { Request, Response, NextFunction } from "express";

// An async handler that passes any error to the next function
// to be handled by global middleware.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
