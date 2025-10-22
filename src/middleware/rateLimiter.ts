import { logger } from "@/helpers/logger.ts";
import { apiResponse } from "@/helpers/response.ts";
import type { RateLimitRequestHandler } from "express-rate-limit";
import { rateLimit } from "express-rate-limit";
import { HttpErrors } from "../helpers/Http.ts";

export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req, res) => {
      logger.warn(
        {
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          path: req.path,
          method: req.method
        },
        "Rate limit exceeded"
      );

      logger.debug({ options }, "Rate limit request details");
      const response = apiResponse.error(HttpErrors.TooManyRequests(options.message));

      res.status(response.code).json(response);
    }
  });
};

// Standard rate limit for regular API operations
export const standardRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: "Too many requests from this IP, please try again later."
});

// Stricter rate limit for admin operations
export const adminRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes for admin operations
  message: "Too many admin requests from this IP, please try again later.",
  skipSuccessfulRequests: true
});

// Very strict rate limit for authentication operations
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes for auth operations
  message: "Too many authentication attempts, please try again later."
});
