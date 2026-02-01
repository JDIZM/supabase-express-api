import { logger } from "@/helpers/index.ts";
import { supabase } from "@/services/supabase.ts";

/**
 * Verify JWT token using Supabase getClaims()
 *
 * This method automatically adapts based on your Supabase key system:
 * - With asymmetric keys: Verifies locally using Web Crypto API (fast, secure)
 * - With symmetric keys: Makes network call to Auth server (slower, but safe)
 */
export const verifyToken = async (
  token: string
): Promise<{
  sub: string;
} | null> => {
  try {
    const { data, error } = await supabase.auth.getClaims(token);

    if (error || !data) {
      logger.warn({ error }, "Token verification failed via getClaims()");
      return null;
    }

    const sub = data.claims.sub as string;

    if (!sub) {
      logger.warn("Token missing 'sub' claim");
      return null;
    }

    return { sub };
  } catch (err) {
    logger.error({ err }, "Token validation failed");
    return null;
  }
};
