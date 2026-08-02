import express, { type Application, type NextFunction, type Request, type Response } from 'express'

export type TestRouteMiddleware = (req: Request, res: Response, next: NextFunction) => void

export type TestRoute = {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  path: string
  middleware: TestRouteMiddleware[]
}

/**
 * Build a bare express app wired with exactly the given (method, path, middleware) routes, each
 * terminating in a 200 handler. Removes the app/route-registration ceremony shared across the
 * startup-guard tests; which middleware is wired to which route stays explicit at each call site.
 */
export function buildRouterApp(routes: TestRoute[]): Application {
  const app = express()

  for (const route of routes) {
    app[route.method](route.path, ...route.middleware, (_req: Request, res: Response) => res.end())
  }

  return app
}
