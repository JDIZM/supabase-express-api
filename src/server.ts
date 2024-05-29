import express from "express";
import cors from "cors";
import helmet from "helmet";
import "./services/supabase.js";
import cookieParser from "cookie-parser";
import { config } from "./config.ts";
import { pinoHttp } from "pino-http";
import { routes } from "./routes/index.ts";
import { logger } from "./helpers/index.ts";
import { corsOptions } from "./cors.ts";

const checkConfigIsValid = () => {
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

const corsWhitelist = [`http://localhost:${config.port}`, config.appUrl];

const corsOptions = {
  origin: corsWhitelist,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

routes(app);

app.listen(config.port, () => {
  logger.info(`[server]: Server is running at http://localhost:${config.port}`);
});
