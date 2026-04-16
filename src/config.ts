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

const prodSafeString = (message: string) =>
  STAGE === "production"
    ? z.string().min(1, message)
    : z.string().min(1, message).optional().default("placeholder")

const configSchema = z.object({
  env: z.enum(stages),
  port: z.coerce.number().int().positive().default(4000),
  appUrl: z.string().min(1),
  db_host: z.string().min(1).default("localhost"),
  db_port: z.coerce.number().int().positive().default(5432),
  db_user: z.string().min(1).default("postgres"),
  // Passwords and URLs must be supplied in production; dev/test get safe defaults.
  db_password: prodSafeString("POSTGRES_PASSWORD is required in production"),
  db_name: z.string().min(1).default("postgres"),
  supabaseUrl: z
    .string()
    .url()
    .refine(
      (url) => STAGE !== "production" || !url.includes("example.supabase.co"),
      "SUPABASE_URL must be set to a real project URL in production"
    ),
  supabasePublishableKey: z
    .string()
    .min(
      1,
      "SUPABASE_PUBLISHABLE_KEY is required. Get it from `supabase status` or your Supabase dashboard."
    ),
  supabaseSecretKey: z.string().optional(),
})

const parseConfig = () => {
  const port = process.env.PORT
  const rawConfig = {
    env: STAGE,
    port,
    appUrl: process.env.APP_URL || `http://localhost:${port || 4000}`,
    db_host: process.env.POSTGRES_HOST,
    db_port: process.env.POSTGRES_PORT,
    db_user: process.env.POSTGRES_USER,
    db_password: process.env.POSTGRES_PASSWORD,
    db_name: process.env.POSTGRES_DB,
    supabaseUrl: process.env.SUPABASE_URL || "https://example.supabase.co",
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  }

  const result = configSchema.safeParse(rawConfig)

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      logger.error(`config: ${issue.path.join(".") || "<root>"}: ${issue.message}`)
    })
    throw new Error("Configuration validation failed. Check environment variables.")
  }

  logger.info(`running in env: ${STAGE}`)
  return result.data
}

export const config = parseConfig()
export type Config = typeof config
