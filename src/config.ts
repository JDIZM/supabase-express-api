import dotenv from 'dotenv'
import { z } from 'zod'
import { logger } from '@/helpers/logger.ts'

const SUPABASE_URL_PLACEHOLDERS = new Set([
  'https://example.supabase.co',
  'https://your-project.supabase.co',
  'https://project.supabase.co',
  'https://xxxx.supabase.co',
])

export const stages = ['development', 'production', 'test'] as const

export type Stage = (typeof stages)[number]

export const ENV = process.env.NODE_ENV ?? 'development'

export const getStage = (env: string): Stage => {
  if (!stages.includes(env as Stage)) {
    throw new Error(`Invalid environment: ${env}`)
  }
  return env as Stage
}

export const STAGE = getStage(ENV)

if (STAGE !== 'production') {
  dotenv.config()
}

// Missing env vars arrive as `undefined`, which fails z.string()'s base type check before
// .min(1, message) ever runs, so the custom "required" message never surfaces. Preprocessing
// undefined/null to "" lets the empty-string case (and therefore the message) be reached for
// both an absent var and an explicitly empty one.
const requiredProdString = (message: string) =>
  z.preprocess((val) => val ?? '', z.string().min(1, message))

const prodSafeString = (message: string) =>
  STAGE === 'production'
    ? requiredProdString(message)
    : z.string().min(1, message).optional().default('placeholder')

const configSchema = z.object({
  env: z.enum(stages),
  port: z.coerce.number().int().positive().default(4000),
  appUrl: z.string().min(1),
  db_host: z.string().min(1).default('localhost'),
  db_port: z.coerce.number().int().positive().default(5432),
  db_user: z.string().min(1).default('postgres'),
  // Passwords and URLs must be supplied in production; dev/test get safe defaults.
  db_password: prodSafeString('POSTGRES_PASSWORD is required in production'),
  db_name: z.string().min(1).default('postgres'),
  // Self-hosted Supabase / a CNAME'd project URL won't match *.supabase.(co|in) — opt out of the
  // host allowlist explicitly via ALLOW_CUSTOM_SUPABASE_HOST=true rather than being locked out.
  supabaseUrl: z
    .string()
    .url()
    .superRefine((url, ctx) => {
      if (STAGE !== 'production') return

      if (SUPABASE_URL_PLACEHOLDERS.has(url)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'SUPABASE_URL must be set to a real project URL in production (placeholder detected)',
        })
        return
      }

      if (process.env.ALLOW_CUSTOM_SUPABASE_HOST === 'true') return

      // Malformed URLs already fail the .url() check above, but that check runs independently
      // of this refinement in Zod 4 — guard `new URL()` so a bad value can't throw out of
      // safeParse with a bare, field-less TypeError.
      let hostname: string
      try {
        hostname = new URL(url).hostname
      } catch {
        // .url() already reported this; don't double-report.
        return
      }

      if (!/\.supabase\.(co|in)$/.test(hostname)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'SUPABASE_URL must point to a *.supabase.co or *.supabase.in host in production ' +
            "(set ALLOW_CUSTOM_SUPABASE_HOST=true for self-hosted/CNAME'd Supabase projects)",
        })
      }
    }),
  supabasePublishableKey: requiredProdString(
    'SUPABASE_PUBLISHABLE_KEY is required. Get it from `supabase status` or your Supabase dashboard.'
  ),
  supabaseSecretKey: z.string().optional(),
})

export const parseConfig = () => {
  const rawConfig = {
    env: STAGE,
    port: process.env.PORT,
    appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`,
    db_host: process.env.POSTGRES_HOST,
    db_port: process.env.POSTGRES_PORT,
    db_user: process.env.POSTGRES_USER,
    db_password: process.env.POSTGRES_PASSWORD,
    db_name: process.env.POSTGRES_DB,
    supabaseUrl: process.env.SUPABASE_URL || 'https://example.supabase.co',
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  }

  const result = configSchema.safeParse(rawConfig)

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      logger.error(`config: ${issue.path.join('.') || '<root>'}: ${issue.message}`)
    })
    throw new Error('Configuration validation failed. Check environment variables.')
  }

  logger.info(`running in env: ${STAGE}`)
  return result.data
}

export const config = parseConfig()
export type Config = typeof config
