import { logger } from "@/helpers/index.ts";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Token Testing Utility
 *
 * Uses Supabase getClaims() for token verification - no JWT_SECRET needed.
 * Works with both asymmetric (new sb_publishable_*) and symmetric (old eyJhbG...) keys.
 */

interface TokenClaims {
  sub: string;
  email?: string;
  iss?: string;
  aud?: string;
  role?: string;
  exp?: number;
  iat?: number;
  session_id?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

class TokenTester {
  private supabase;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PK;

    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) are required");
    }

    this.supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Verify and decode a JWT token using getClaims()
   */
  async verifyToken(
    token: string,
    options: { showPayload?: boolean; checkExpiry?: boolean } = {}
  ): Promise<TokenClaims | null> {
    try {
      const { data, error } = await this.supabase.auth.getClaims(token);

      if (error || !data) {
        logger.error("❌ Token verification failed:", error?.message || "No data returned");
        return null;
      }

      const claims = data.claims as TokenClaims;

      if (options.showPayload) {
        logger.info("✅ Token is valid");
        logger.info(
          {
            sub: claims.sub,
            email: claims.email,
            role: claims.role,
            issuer: claims.iss,
            audience: claims.aud,
            issuedAt: claims.iat ? new Date(claims.iat * 1000).toISOString() : undefined,
            expiresAt: claims.exp ? new Date(claims.exp * 1000).toISOString() : undefined,
            sessionId: claims.session_id
          },
          "📋 Token payload:"
        );
      }

      if (options.checkExpiry && claims.exp) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = claims.exp - now;

        if (timeUntilExpiry <= 0) {
          logger.warn("⚠️  Token has expired");
        } else {
          logger.info(`⏰ Token expires in ${Math.floor(timeUntilExpiry / 60)} minutes`);
        }
      }

      return claims;
    } catch (error) {
      logger.error("❌ Token verification failed:", error);
      return null;
    }
  }

  /**
   * Extract token information without verification (for debugging)
   * Decodes base64 payload without signature verification
   */
  decodeWithoutVerification(token: string): TokenClaims | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3 || !parts[0] || !parts[1]) {
        logger.error("❌ Invalid JWT format");
        return null;
      }

      const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

      logger.info(
        {
          header,
          payload
        },
        "🔍 Token decoded without verification:"
      );

      return payload;
    } catch (error) {
      logger.error("❌ Failed to decode token:", error);
      return null;
    }
  }

  /**
   * Check if token format is valid JWT
   */
  isValidJWTFormat(token: string): boolean {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    const isValid = jwtRegex.test(token);

    if (isValid) {
      logger.info("✅ Token format is valid JWT");
    } else {
      logger.error("❌ Token format is invalid");
    }

    return isValid;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    logger.info("JWT Token Testing Utility (using Supabase getClaims)");
    logger.info("");
    logger.info("Usage examples:");
    logger.info("  # Test token with full information");
    logger.info("  pnpm token-test --token=<jwt-token> --show-payload --check-expiry");
    logger.info("");
    logger.info("  # Decode without verification (debug)");
    logger.info("  pnpm token-test --token=<jwt-token> --decode-only");
    logger.info("");
    logger.info("Note: No JWT_SECRET needed - getClaims() handles verification automatically.");
    return;
  }

  const options = args
    .map((str) => str.replace(/^-+/, "").split("="))
    .reduce<{ [key: string]: string | boolean }>((acc, curr) => {
      const [key, value] = curr;
      if (!key) return acc;
      acc[key] = value || true;
      return acc;
    }, {});

  try {
    const tester = new TokenTester();

    // Token is required
    if (!options.token) {
      logger.error("❌ --token is required");
      process.exit(1);
    }

    const token = options.token as string;

    // Check token format
    if (!tester.isValidJWTFormat(token)) {
      process.exit(1);
    }

    // Decode without verification
    if (options["decode-only"]) {
      tester.decodeWithoutVerification(token);
      return;
    }

    // Verify token with options
    const decoded = await tester.verifyToken(token, {
      showPayload: options["show-payload"] as boolean,
      checkExpiry: options["check-expiry"] as boolean
    });

    if (decoded) {
      logger.info("🎉 Token verification completed successfully");
    } else {
      logger.error("💥 Token verification failed");
      process.exit(1);
    }
  } catch (error) {
    logger.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TokenTester };
