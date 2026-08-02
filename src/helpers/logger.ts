import { pino } from 'pino'

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'debug',
    redact: {
      paths: [
        'password',
        'passwordHash',
        'token',
        'accessToken',
        'refreshToken',
        'access_token',
        'refresh_token',
        'authorization',
        '*.password',
        '*.passwordHash',
        '*.token',
        '*.accessToken',
        '*.refreshToken',
        '*.access_token',
        '*.refresh_token',
        '*.authorization',
        '*.*.password',
        '*.*.passwordHash',
        '*.*.token',
        '*.*.accessToken',
        '*.*.refreshToken',
        '*.*.access_token',
        '*.*.refresh_token',
        'req.body.password',
        'req.body.passwordHash',
        'req.body.token',
        'req.body.accessToken',
        'req.body.refreshToken',
        'req.body.access_token',
        'req.body.refresh_token',
        'req.headers.authorization',
        'req.headers.cookie',
        "res.headers['set-cookie']",
        // Some call sites log the raw Express `req`/pino-http `req` shape directly (not nested
        // under a `req` key) — cover both shapes rather than assuming one.
        'headers.authorization',
        'headers.cookie',
        'cookies',
        'authHeader',
        '*.authHeader',
        // Config secrets (e.g. accidentally logged via `logger.info({ config })`).
        'db_password',
        'supabaseSecretKey',
        '*.db_password',
        '*.supabaseSecretKey',
      ],
      censor: '[REDACTED]',
    },
  },
  process.stdout
)
