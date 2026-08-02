import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `config.ts` reads `process.env` and runs validation at module load time (`export const config
// = parseConfig()`), so each test needs a fresh module instance loaded after its env vars are in
// place. The logger is mocked so we can assert on the *content* of what gets reported for a
// failed field, without depending on stdout.

const REQUIRED_PROD_ENV = {
  NODE_ENV: 'production',
  POSTGRES_PASSWORD: 'super-secret',
  SUPABASE_URL: 'https://my-project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
}

vi.mock('@/helpers/logger.ts', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('parseConfig', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('reports a malformed SUPABASE_URL as a field-named Zod error, not a thrown TypeError', async () => {
    Object.assign(process.env, REQUIRED_PROD_ENV, { SUPABASE_URL: 'not-a-valid-url' })

    const { logger } = await import('@/helpers/logger.ts')
    vi.resetModules()

    // The bug this guards against: `new URL()` throwing inside a `.refine()` propagates out of
    // `safeParse` entirely, so `parseConfig` would throw a bare `TypeError: Invalid URL` instead
    // of its own "Configuration validation failed" error.
    await expect(import('./config.ts')).rejects.toThrow('Configuration validation failed')

    expect(logger.error).toHaveBeenCalled()
    const calls = (logger.error as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    // Zod's own .url() message legitimately says "Invalid URL" here — that's fine, it's a
    // field-named issue reported through the normal safeParse error path. What we're guarding
    // against is a *thrown, uncaught* TypeError bypassing that path entirely (see the
    // `rejects.toThrow` assertion above, which would fail with a bare TypeError otherwise).
    expect(calls.some((msg) => msg.includes('supabaseUrl'))).toBe(true)
  })

  it('surfaces the intended message for a MISSING required production var (not a generic type error)', async () => {
    Object.assign(process.env, REQUIRED_PROD_ENV)
    delete process.env.POSTGRES_PASSWORD

    const { logger } = await import('@/helpers/logger.ts')
    vi.resetModules()

    await import('./config.ts').catch(() => undefined)

    const calls = (logger.error as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(calls.some((msg) => msg.includes('POSTGRES_PASSWORD is required in production'))).toBe(
      true
    )
  })

  it('surfaces the intended message for an EMPTY required production var', async () => {
    Object.assign(process.env, REQUIRED_PROD_ENV, { POSTGRES_PASSWORD: '' })

    const { logger } = await import('@/helpers/logger.ts')
    vi.resetModules()

    await import('./config.ts').catch(() => undefined)

    const calls = (logger.error as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(calls.some((msg) => msg.includes('POSTGRES_PASSWORD is required in production'))).toBe(
      true
    )
  })

  it('allows a non-supabase.co host in production when ALLOW_CUSTOM_SUPABASE_HOST=true', async () => {
    Object.assign(process.env, REQUIRED_PROD_ENV, {
      SUPABASE_URL: 'https://supabase.example.com',
      ALLOW_CUSTOM_SUPABASE_HOST: 'true',
    })

    vi.resetModules()
    const { config } = await import('./config.ts')
    expect(config.supabaseUrl).toBe('https://supabase.example.com')
  })

  it('rejects a non-supabase.co host in production without the escape hatch', async () => {
    Object.assign(process.env, REQUIRED_PROD_ENV, {
      SUPABASE_URL: 'https://supabase.example.com',
    })
    delete process.env.ALLOW_CUSTOM_SUPABASE_HOST

    const { logger } = await import('@/helpers/logger.ts')
    vi.resetModules()

    await import('./config.ts').catch(() => undefined)

    const calls = (logger.error as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
    expect(calls.some((msg) => msg.includes('supabaseUrl'))).toBe(true)
  })
})
