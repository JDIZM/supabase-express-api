import { pino } from "pino"

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "debug",
    redact: {
      paths: [
        "password",
        "token",
        "accessToken",
        "refreshToken",
        "authorization",
        "*.password",
        "*.token",
        "*.accessToken",
        "*.refreshToken",
        "*.authorization",
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers['set-cookie']",
      ],
      censor: "[REDACTED]",
    },
  },
  process.stdout
)
