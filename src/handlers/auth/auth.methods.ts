import { logger } from "@/helpers/index.ts";
import jwt from "jsonwebtoken";
import { config } from "../../config.ts";

export const verifyToken = async (
  token: string
): Promise<{
  sub: string;
} | null> => {
  try {
    return jwt.verify(token, config.jwtSecret) as { sub: string };
  } catch (err) {
    logger.error("Token validation failed:", err);
    return null;
  }
};
