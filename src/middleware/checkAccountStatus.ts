import { logger, gatewayResponse } from "@/helpers/index.ts";
import type { NextFunction, Request, Response } from "express";
import { db } from "@/services/db/drizzle.ts";
import { accounts } from "@/schema.ts";
import { eq } from "drizzle-orm";

/**
 * Middleware to check account status - only use on critical operations
 * This middleware should be applied AFTER isAuthenticated middleware
 */
export const checkAccountStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { accountId } = req;

  if (!accountId) {
    const response = gatewayResponse().error(401, new Error("Authentication required"), "Authentication required");
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
      const response = gatewayResponse().error(401, new Error("Account not found"), "Account not found");
      res.status(response.code).send(response);
      return;
    }

    if (account.status !== "active") {
      logger.warn({ msg: `Access denied for ${account.status} account: ${accountId}` });
      const response = gatewayResponse().error(
        403,
        new Error(`Account is ${account.status}`),
        `Account is ${account.status}`
      );
      res.status(response.code).send(response);
      return;
    }

    return next();
  } catch (err) {
    logger.error({ msg: "Error checking account status", err, accountId });
    const response = gatewayResponse().error(500, err as Error, "Error checking account status");
    res.status(response.code).send(response);
    return;
  }
};
