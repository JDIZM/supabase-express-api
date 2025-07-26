import type { Application } from "express";
import { isAuthenticated } from "@/middleware/isAuthenticated.ts";
import { isAuthorized } from "@/middleware/isAuthorized.ts";
import { adminRateLimit } from "@/middleware/rateLimiter.ts";
import { checkAccountStatus } from "@/middleware/checkAccountStatus.ts";
import {
  listAllAccounts,
  createAccountForUser,
  updateAccountRole,
  updateAccountStatus,
  listAllWorkspaces,
  listAllMemberships
} from "@/handlers/admin/admin.handlers.ts";

export function adminRoutes(app: Application): void {
  // All admin routes require authentication, account status check, and SuperAdmin role
  // Apply stricter rate limiting for admin operations

  // Account management
  app.get("/admin/accounts", adminRateLimit, isAuthenticated, checkAccountStatus, isAuthorized, listAllAccounts);
  app.post("/admin/accounts", adminRateLimit, isAuthenticated, checkAccountStatus, isAuthorized, createAccountForUser);
  app.put(
    "/admin/accounts/:id/role",
    adminRateLimit,
    isAuthenticated,
    checkAccountStatus,
    isAuthorized,
    updateAccountRole
  );
  app.put(
    "/admin/accounts/:id/status",
    adminRateLimit,
    isAuthenticated,
    checkAccountStatus,
    isAuthorized,
    updateAccountStatus
  );

  // Workspace monitoring (read-only)
  app.get("/admin/workspaces", adminRateLimit, isAuthenticated, checkAccountStatus, isAuthorized, listAllWorkspaces);

  // Membership management
  app.get("/admin/memberships", adminRateLimit, isAuthenticated, checkAccountStatus, isAuthorized, listAllMemberships);
}
