import express from "express";
import { config } from "./config.js";
import { pinoHttp } from "pino-http";
import { routes } from "./routes/index.js";

const { logger } = pinoHttp();

console.log("config", config);

const app = express();

app.use(
  pinoHttp({
    logger
  })
);

routes(app);

app.listen(config.port, () => {
  console.log(`[server]: Server is running at http://localhost:${config.port}`);
});
