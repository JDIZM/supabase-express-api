import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config.ts";
import { pinoHttp } from "pino-http";
import { routes } from "./routes/index.ts";
import { logger } from "./helpers/index.ts";
import { corsOptions } from "./cors.ts";

import type { Request, Response } from "express";

import "./services/sentry.ts"; // Initialize Sentry if enabled.

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
    autoLogging: true
  })
);

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// parse application/json
app.use(express.json());

// Apply CORS middleware to all routes before defining them
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Pre-flight requests

// Define routes
routes(app);

app.listen(config.port, () => {
  logger.info(`[server]: Server is running on port: ${config.port}`);
});
