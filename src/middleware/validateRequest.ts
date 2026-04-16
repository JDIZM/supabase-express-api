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

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body)
      if (!result.success) {
        logger.warn({ issues: result.error.issues, path: req.path }, "body validation failed")
        return respond("body", result.error.issues[0])
      }
      req.validatedBody = result.data
      req.body = result.data
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params)
      if (!result.success) {
        logger.warn({ issues: result.error.issues, path: req.path }, "params validation failed")
        return respond("params", result.error.issues[0])
      }
      req.validatedParams = result.data
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query)
      if (!result.success) {
        logger.warn({ issues: result.error.issues, path: req.path }, "query validation failed")
        return respond("query", result.error.issues[0])
      }
      req.validatedQuery = result.data
    }

    next()
  }
}
