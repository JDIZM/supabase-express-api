import express from "express";
import dotenv from "dotenv";
import { pinoHttp } from "pino-http";
import { routes } from "./routes/index.js";

const { logger } = pinoHttp();

const env = process.env.NODE_ENV || "development";
const port = process.env.PORT || 3000;

if (env !== "production") {
  dotenv.config();
}

const app = express();

app.use(
  pinoHttp({
    logger
  })
);

routes(app);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
