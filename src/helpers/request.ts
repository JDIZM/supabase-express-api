import type { NextFunction, Request, Response } from 'express'

/**
 * Extract IP address from request headers
 * Handles various proxy headers and formats
 */
export function getIpFromRequest(req: Request): string | undefined {
  const ips =
    req.headers['cf-connecting-ip'] ??
    req.headers['x-real-ip'] ??
    req.headers['x-forwarded-for'] ??
    req.ip ??
    ''

  const result = ips instanceof Array ? ips : ips.split(',')
  return result[0]?.trim()
}

/**
 * Express 5's ParamsDictionary types every param value as `string | string[]` (path-to-regexp v8
 * supports repeating params like `:id+`/`:id*`, which capture arrays). None of this API's routes
 * use repeating params, so a param arriving as an array can only mean a malformed/unexpected
 * request — fail closed (empty string, which callers already treat as "missing") rather than
 * silently taking `array[0]` and matching against the wrong thing.
 */
export function getSingleParam(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : ''
}

// An async handler that passes any error to the next function
// to be handled by global middleware.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next)
  }
