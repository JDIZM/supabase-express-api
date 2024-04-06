import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { pinoHttp } from "pino-http";
import { routes } from "./routes/index.js";
import { logger as localLogger } from "./helpers/logger.js";
import "./services/supabase.js";
import cookieParser from "cookie-parser";

const { logger } = pinoHttp();

localLogger.debug("config", config);

const checkConfigIsValid = () => {
  Object.values(config).forEach((value) => {
    if (!value) {
      localLogger.error("config is invalid", config);
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
    logger
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
  localLogger.info(`[server]: Server is running at http://localhost:${config.port}`);
});
