import { logger } from "./helpers/index.ts";

export const whitelist: RegExp[] = [
  /^https?:\/\/localhost:3000$/,
  /^https?:\/\/example\.com$/,
  /^https?:\/\/subdomain\.example\.com$/
  // Add more patterns as needed
];

export const corsOptions = {
  origin: function (origin: string | undefined, callback: (a: null | Error, b?: boolean) => void): void {
    // Allows an undefined origin. eg GET requests from the browser or curl requests.
    const isOriginAllowed = origin ? whitelist.some((pattern) => pattern.test(origin)) : true;
    logger.debug(`cors Origin: ${origin}`);

    if (isOriginAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
};
