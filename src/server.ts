import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config.ts";
import { pinoHttp } from "pino-http";
import { routes } from "./routes/index.ts";
import { adminRoutes } from "./routes/admin.ts";
import { logger } from "./helpers/index.ts";
import { corsOptions } from "./cors.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import { randomUUID } from "node:crypto";
import { setupSwagger } from "./docs/swagger.ts";
import { standardRateLimit } from "./middleware/rateLimiter.ts";

import "./helpers/permissions.ts";
import "./services/sentry.ts"; // Initialize Sentry if enabled.

import type { Request, Response } from "express";

const checkConfigIsValid = (): void => {
  Object.values(config).forEach((value) => {
    if (!value) {
      logger.error({ msg: "config is invalid", config });
      throw new Error("config is invalid");
    }
  });
};

checkConfigIsValid();

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    xDownloadOptions: false
  })
);

app.use(cookieParser());

app.use(
  pinoHttp({
    logger: logger,
    // Logs every request.
    autoLogging: true,
    genReqId: (req) => req.headers["x-request-id"] || randomUUID(),
    customProps: (req: Request, _res) => ({
      accountId: req.accountId,
      workspaceId: req.headers["x-workspace-id"]
    })
  })
);

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// parse application/json
app.use(express.json());

// Apply CORS middleware to all routes before defining them
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Pre-flight requests

// Apply standard rate limiting to all routes
app.use(standardRateLimit);

app.get("/health", (_req: Request, res: Response) => {
  const data = {
    uptime: process.uptime(),
    message: "Ok",
    date: new Date()
  };
  res.status(200).send(data);
});

// Setup Swagger documentation
setupSwagger(app);

// Define routes
routes(app);
adminRoutes(app);

// Use the global error handler after defining routes to make sure it's called last.
app.use(errorHandler);

export const server = app.listen(Number(config.port), () => {
  logger.info(`[server]: Server is running on port: ${config.port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.debug("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    logger.debug("HTTP server closed");
  });
});
