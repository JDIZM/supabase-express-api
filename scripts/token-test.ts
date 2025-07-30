import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { logger } from "@/helpers/index.ts";

dotenv.config();

interface TokenPayload {
  sub: string;
  email: string;
  iss: string;
  aud: string;
  role: string;
  exp: number;
  iat: number;
  session_id?: string;
  app_metadata?: {
    provider: string;
    providers: string[];
  };
  user_metadata?: {
    email_verified: boolean;
  };
}

// interface TokenTestOptions {
//   token?: string;
//   secret?: string;
//   showPayload?: boolean;
//   checkExpiry?: boolean;
// }

class TokenTester {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.SUPABASE_AUTH_JWT_SECRET || "";
    if (!this.secret) {
      throw new Error("JWT secret is required. Set SUPABASE_AUTH_JWT_SECRET environment variable.");
    }
  }

  /**
   * Verify and decode a JWT token
   */
  verifyToken(token: string, options: { showPayload?: boolean; checkExpiry?: boolean } = {}): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as TokenPayload;

      if (options.showPayload) {
        logger.info("✅ Token is valid");
        logger.info(
          {
            sub: decoded.sub,
            email: decoded.email,
            role: decoded.role,
            issuer: decoded.iss,
            audience: decoded.aud,
            issuedAt: new Date(decoded.iat * 1000).toISOString(),
            expiresAt: new Date(decoded.exp * 1000).toISOString(),
            sessionId: decoded.session_id
          },
          "📋 Token payload:"
        );
      }

      if (options.checkExpiry) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - now;

        if (timeUntilExpiry <= 0) {
          logger.warn("⚠️  Token has expired");
        } else {
          logger.info(`⏰ Token expires in ${Math.floor(timeUntilExpiry / 60)} minutes`);
        }
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.error("❌ Token has expired");
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.error("❌ Token is invalid:", error.message);
      } else {
        logger.error("❌ Token verification failed:", error);
      }
      return null;
    }
  }

  /**
   * Test if the current secret can decode the token
   */
  testSecret(token: string): boolean {
    try {
      jwt.verify(token, this.secret);
      logger.info("✅ Secret is correct for this token");
      return true;
    } catch {
      logger.error("❌ Secret is incorrect for this token");
      return false;
    }
  }

  /**
   * Extract token information without verification (for debugging)
   */
  decodeWithoutVerification(token: string): jwt.Jwt | null {
    try {
      const decoded = jwt.decode(token, { complete: true });
      logger.info(
        {
          header: decoded?.header,
          payload: decoded?.payload
        },
        "🔍 Token decoded without verification:"
      );
      return decoded;
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

  /**
   * Generate a test token for development (requires account UUID)
   */
  generateTestToken(
    accountId: string,
    email: string,
    options: {
      expiresIn?: string;
      role?: string;
      isSuperAdmin?: boolean;
    } = {}
  ): string {
    // Use SUPABASE_URL to construct the issuer, fallback to test-issuer for development
    const supabaseUrl = process.env.SUPABASE_URL;
    const issuer = supabaseUrl ? `${supabaseUrl}/auth/v1` : "test-issuer";

    const payload = {
      sub: accountId,
      email,
      role: options.role || "authenticated",
      iss: issuer,
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + (options.expiresIn ? parseInt(options.expiresIn) : 3600), // 1 hour default
      iat: Math.floor(Date.now() / 1000),
      app_metadata: {
        provider: "email",
        providers: ["email"]
      },
      user_metadata: {
        email_verified: true
      }
    };

    const token = jwt.sign(payload, this.secret);
    logger.info("🔧 Generated test token for development");
    return token;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    logger.info("JWT Token Testing Utility");
    logger.info("");
    logger.info("Usage examples:");
    logger.info("  # Test token with full information");
    logger.info("  pnpm token-test --token=<jwt-token> --show-payload --check-expiry");
    logger.info("");
    logger.info("  # Test secret compatibility");
    logger.info("  pnpm token-test --token=<jwt-token> --test-secret");
    logger.info("");
    logger.info("  # Decode without verification (debug)");
    logger.info("  pnpm token-test --token=<jwt-token> --decode-only");
    logger.info("");
    logger.info("  # Generate test token");
    logger.info("  pnpm token-test --generate --account-id=<uuid> --email=test@example.com");
    logger.info("");
    logger.info("  # Use different secret");
    logger.info("  pnpm token-test --token=<jwt-token> --secret=<custom-secret>");
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
    const tester = new TokenTester(options.secret as string);

    // Generate test token
    if (options.generate) {
      if (!options["account-id"] || !options.email) {
        logger.error("❌ --account-id and --email are required for token generation");
        process.exit(1);
      }

      const token = tester.generateTestToken(options["account-id"] as string, options.email as string, {
        expiresIn: options["expires-in"] as string,
        role: options.role as string
      });

      console.log("Generated token:", token);
      return;
    }

    // Token is required for other operations
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

    // Test secret compatibility
    if (options["test-secret"]) {
      tester.testSecret(token);
      return;
    }

    // Verify token with options
    const decoded = tester.verifyToken(token, {
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
