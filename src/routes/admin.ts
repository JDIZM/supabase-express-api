import type { Application } from "express";
import { isAuthenticated } from "@/middleware/isAuthenticated.ts";
import { isAuthorized } from "@/middleware/isAuthorized.ts";
import { adminRateLimit } from "@/middleware/rateLimiter.ts";
import {
  listAllAccounts,
  createAccountForUser,
  updateAccountRole,
  listAllWorkspaces,
  createWorkspaceForAccount,
  deleteAnyWorkspace,
  listAllMemberships
} from "@/handlers/admin/admin.handlers.ts";

export function adminRoutes(app: Application): void {
  // All admin routes require authentication and SuperAdmin role
  // Apply stricter rate limiting for admin operations

  // Account management
  app.get("/admin/accounts", adminRateLimit, isAuthenticated, isAuthorized, listAllAccounts);
  app.post("/admin/accounts", adminRateLimit, isAuthenticated, isAuthorized, createAccountForUser);
  app.put("/admin/accounts/:id/role", adminRateLimit, isAuthenticated, isAuthorized, updateAccountRole);

  // Workspace management
  app.get("/admin/workspaces", adminRateLimit, isAuthenticated, isAuthorized, listAllWorkspaces);
  app.post("/admin/workspaces", adminRateLimit, isAuthenticated, isAuthorized, createWorkspaceForAccount);
  app.delete("/admin/workspaces/:id", adminRateLimit, isAuthenticated, isAuthorized, deleteAnyWorkspace);

  // Membership management
  app.get("/admin/memberships", adminRateLimit, isAuthenticated, isAuthorized, listAllMemberships);
}
