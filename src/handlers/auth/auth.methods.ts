import jwt from "jsonwebtoken";
import { config } from "../../config.ts";
import { logger } from "@/helpers/index.ts";

export const verifyToken = async (token: string) => {
  try {
    return jwt.verify(token, config.jwtSecret) as { sub: string };
  } catch (err) {
    logger.error("Token validation failed:", err);
    return null;
  }
};
