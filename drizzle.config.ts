import type { Config } from 'drizzle-kit'

// Deliberately does NOT import ./src/config.ts. drizzle-kit loads this file
// for `migrate`/`generate`, and the app config validates the WHOLE runtime
// environment (Supabase URL and keys, etc.). A migration job legitimately
// has only database credentials, so importing it made `pnpm migrate` fail
// with "Configuration validation failed" in CI — migrations are a deploy
// step, not an app boot.

const isProduction = process.env.NODE_ENV === 'production'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `drizzle-kit needs DATABASE_URL, or all of POSTGRES_HOST/PORT/USER/PASSWORD/DB. Missing: ${name}`
    )
  }
  return value
}

function port(): number {
  const raw = process.env.POSTGRES_PORT ?? '5432'
  const parsed = Number(raw)
  // Number('') is 0 and Number('abc') is NaN; both would surface later as a
  // baffling connection failure rather than a config error.
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`POSTGRES_PORT must be a port number, got "${raw}"`)
  }
  return parsed
}

function credentials() {
  const url = process.env.DATABASE_URL
  if (url) return { url }

  return {
    host: requireEnv('POSTGRES_HOST'),
    user: requireEnv('POSTGRES_USER'),
    port: port(),
    // Never defaulted. A silent fallback to "postgres" would let a
    // production migration run against whatever that happens to reach,
    // and it contradicts src/config.ts, which requires this in production.
    password: isProduction
      ? requireEnv('POSTGRES_PASSWORD')
      : (process.env.POSTGRES_PASSWORD ?? 'postgres'),
    database: requireEnv('POSTGRES_DB'),
    ssl: isProduction,
  }
}

export default {
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: credentials(),
} satisfies Config
