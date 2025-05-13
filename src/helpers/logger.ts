import { pino } from "pino";

export const logger = pino({ level: "debug" }, process.stdout);
