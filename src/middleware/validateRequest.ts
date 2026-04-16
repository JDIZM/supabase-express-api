import type { Request, Response, NextFunction } from "express"
import type { z } from "zod"
import { HttpErrors } from "@/helpers/Http.ts"
import { apiResponse } from "@/helpers/response.ts"
import { logger } from "@/helpers/index.ts"

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
 * @example
 * const CreateUserSchema = z.object({ name: z.string(), email: z.string().email() })
 * router.post('/users', validateRequest({ body: CreateUserSchema }), (req, res) => {
 *   const { name, email } = req.body
 * })
 */
export const validateRequest = (schemas: ValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const respond = (kind: "body" | "params" | "query", issue?: { message?: string }): void => {
      const error = HttpErrors.BadRequest(
        `Invalid request ${kind}: ${issue?.message || "validation failed"}`
      )
      const response = apiResponse.error(error)
      res.status(response.code).json(response)
    }

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
          return respond(key, result.error.issues[0])
        }
        assign(result.data)
      }

      next()
    } catch (err) {
      logger.error({ err, path: req.path }, "Unexpected validation error")
      const error = HttpErrors.InternalError("Request validation failed")
      const response = apiResponse.error(error)
      res.status(response.code).json(response)
    }
  }
}
