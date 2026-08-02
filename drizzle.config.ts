import type { Config } from 'drizzle-kit'

// Deliberately does NOT import ./src/config.ts. drizzle-kit loads this file
// for `migrate`/`generate`, and the app config validates the WHOLE runtime
// environment (Supabase URL and keys, etc.). A migration job legitimately
// has only database credentials, so importing it made `pnpm migrate` fail
// with "Configuration validation failed" in CI — migrations are a deploy
// step, not an app boot.
const url = process.env.DATABASE_URL

const dbCredentials = url
  ? { url }
  : {
      host: process.env.POSTGRES_HOST ?? 'localhost',
      user: process.env.POSTGRES_USER ?? 'postgres',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      password: process.env.POSTGRES_PASSWORD ?? 'postgres',
      database: process.env.POSTGRES_DB ?? 'postgres',
      ssl: process.env.NODE_ENV === 'production',
    }

if (!url && !process.env.POSTGRES_HOST) {
  throw new Error(
    'drizzle-kit needs DATABASE_URL, or the POSTGRES_* variables, to reach the database'
  )
}

export default {
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials,
} satisfies Config
