import { logger } from "@/helpers/index.ts";
import { AccountStatus, accounts } from "@/schema.ts";
import { db } from "@/services/db/drizzle.ts";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { HttpErrors } from "../helpers/Http.ts";
import { apiResponse } from "../helpers/response.ts";

/**
 * Middleware to check account status - only use on critical operations
 * This middleware should be applied AFTER isAuthenticated middleware
 */
export const checkAccountStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { accountId } = req;

  if (!accountId) {
    const response = apiResponse.error(HttpErrors.Unauthorized("Authentication required"));
    res.status(response.code).send(response);
    return;
  }

  try {
    // Check account status
    const [account] = await db
      .select({ status: accounts.status })
      .from(accounts)
      .where(eq(accounts.uuid, accountId))
      .limit(1);

    if (!account) {
      logger.error({ msg: `Account not found for accountId: ${accountId}` });
      const response = apiResponse.error(HttpErrors.Unauthorized("Account not found"));
      res.status(response.code).send(response);
      return;
    }

    if (account.status !== AccountStatus.ACTIVE) {
      logger.warn({ msg: `Access denied for ${account.status} account: ${accountId}` });
      const response = apiResponse.error(HttpErrors.Forbidden(`Account is ${account.status}`));
      res.status(response.code).send(response);
      return;
    }

    return next();
  } catch (err) {
    logger.error({ msg: "Error checking account status", err, accountId });
    const response = apiResponse.error(HttpErrors.InternalError("Error checking account status"));
    res.status(response.code).send(response);
    return;
  }
};
