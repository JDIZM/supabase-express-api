import express from "express";
import { config } from "./config.js";
import { pinoHttp } from "pino-http";
import { routes } from "./routes/index.js";
import cors from "cors";
const { logger } = pinoHttp();

console.log("config", config);

const checkConfigIsValid = () => {
  Object.values(config).forEach((value) => {
    if (!value) {
      throw new Error("config is invalid");
    }
  });
};

checkConfigIsValid();

const app = express();

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
  console.log(`[server]: Server is running at http://localhost:${config.port}`);
});
