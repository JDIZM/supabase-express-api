import dotenv from "dotenv"
import { z } from "zod"
import { logger } from "@/helpers/index.ts"

export const stages = ["development", "production", "test"] as const

export type Stage = (typeof stages)[number]

export const ENV = process.env.NODE_ENV ?? "development"

export const getStage = (env: string): Stage => {
  if (!stages.includes(env as Stage)) {
    throw new Error(`Invalid environment: ${env}`)
  }
  return env as Stage
}

export const STAGE = getStage(ENV)

if (STAGE !== "production") {
  dotenv.config()
}

const configSchema = z.object({
  env: z.enum(stages),
  port: z.coerce.number().int().positive(),
  appUrl: z.string().min(1),
  db_host: z.string().min(1),
  db_port: z.coerce.number().int().positive(),
  db_user: z.string().min(1),
  db_password: z.string().min(1),
  db_name: z.string().min(1),
  supabaseUrl: z.string().url(),
  supabasePublishableKey: z
    .string()
    .min(
      1,
      "SUPABASE_PUBLISHABLE_KEY is required. Get it from `supabase status` or your Supabase dashboard."
    ),
  supabaseSecretKey: z.string().optional(),
})

const parseConfig = () => {
  const port = process.env.PORT || 4000
  const rawConfig = {
    env: STAGE,
    port,
    appUrl: process.env.APP_URL || `http://localhost:${port}`,
    db_host: process.env.POSTGRES_HOST || "localhost",
    db_port: process.env.POSTGRES_PORT || 5432,
    db_user: process.env.POSTGRES_USER || "postgres",
    db_password: process.env.POSTGRES_PASSWORD || "postgres",
    db_name: process.env.POSTGRES_DB || "postgres",
    supabaseUrl: process.env.SUPABASE_URL || "https://example.supabase.co",
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  }

  const result = configSchema.safeParse(rawConfig)

  if (!result.success) {
    logger.error({ issues: result.error.issues }, "Invalid configuration")
    result.error.issues.forEach((issue) => {
      logger.error(`  - ${issue.path.join(".")}: ${issue.message}`)
    })
    throw new Error("Configuration validation failed. Check environment variables.")
  }

  return result.data
}

logger.info(`running in env: ${STAGE}`)

export const config = parseConfig()
export type Config = typeof config
