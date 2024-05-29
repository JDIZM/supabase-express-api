export const whitelist: RegExp[] = [
  /^https?:\/\/localhost:3000$/,
  /^https?:\/\/example\.com$/,
  /^https?:\/\/subdomain\.example\.com$/
  // Add more patterns as needed
];

export const corsOptions = {
  origin: function (origin: string | undefined, callback: (a: null | Error, b?: boolean) => void) {
    const isOriginAllowed = origin ? whitelist.some((pattern) => pattern.test(origin)) : true;

    if (isOriginAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
};
