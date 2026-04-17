import type { Request, Response, NextFunction } from "express"
import type { z } from "zod"
import { HttpErrors } from "@/helpers/Http.ts"
import { logger } from "@/helpers/logger.ts"

interface ValidationSchemas {
  body?: z.ZodTypeAny
  params?: z.ZodTypeAny
  query?: z.ZodTypeAny
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      validatedBody?: unknown
      validatedParams?: unknown
      validatedQuery?: unknown
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Middleware factory for validating Express requests with Zod schemas.
 *
 * Parsed output is available on `req.validatedBody`, `req.validatedParams`, and
 * `req.validatedQuery`. `req.body` and `req.params` are also overwritten with
 * parsed data so `transform`/`coerce`/`default` results flow to handlers.
 * `req.query` is NOT overwritten — in Express 5 it's a read-only getter, so
 * consumers must read coerced query values from `req.validatedQuery`.
 *
 * @example
 * const CreateUserSchema = z.object({ name: z.string(), email: z.string().email() })
 * router.post('/users', validateRequest({ body: CreateUserSchema }), (req, res) => {
 *   const { name, email } = req.body
 * })
 */
export const validateRequest = (schemas: ValidationSchemas) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const sources = [
      {
        key: "body" as const,
        input: () => req.body,
        assign: (data: unknown) => {
          req.validatedBody = data
          req.body = data
        },
      },
      {
        key: "params" as const,
        input: () => req.params,
        assign: (data: unknown) => {
          req.validatedParams = data
          req.params = data as typeof req.params
        },
      },
      {
        key: "query" as const,
        input: () => req.query,
        assign: (data: unknown) => {
          req.validatedQuery = data
        },
      },
    ]

    try {
      for (const { key, input, assign } of sources) {
        const schema = schemas[key]
        if (!schema) continue
        const result = schema.safeParse(input())
        if (!result.success) {
          logger.warn({ issues: result.error.issues, path: req.path }, `${key} validation failed`)
          const issue = result.error.issues[0]
          return next(
            HttpErrors.BadRequest(
              `Invalid request ${key}: ${issue?.message || "validation failed"}`
            )
          )
        }
        assign(result.data)
      }
      next()
    } catch (err) {
      logger.error({ err, path: req.path }, "Unexpected validation error")
      next(HttpErrors.InternalError("Request validation failed"))
    }
  }
}
