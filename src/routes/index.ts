import type { Application } from "express";
import { isAuthenticated } from "@/middleware/isAuthenticated.ts";
import { isAuthorized } from "@/middleware/isAuthorized.ts";
import { checkAccountStatus } from "@/middleware/checkAccountStatus.ts";
import { test, permissions } from "@/helpers/index.ts";
import { signInWithPassword, signUp } from "@/handlers/auth/auth.handlers.js";
import { authRateLimit } from "@/middleware/rateLimiter.ts";
import {
  createWorkspace,
  fetchWorkspace,
  fetchWorkspacesByAccountId,
  updateWorkspace,
  deleteWorkspace
} from "@/handlers/workspaces/workspaces.handlers.ts";
import {
  getWorkspaceMembers,
  addWorkspaceMember,
  updateMemberRole,
  removeMember
} from "@/handlers/memberships/memberships.handlers.ts";
import { getAccount, getAccounts, createAccount, updateAccount } from "@/handlers/accounts/accounts.handlers.ts";
import { getCurrentUser } from "@/handlers/me/me.handlers.ts";

const { API_ROUTES } = permissions;

export function routes(app: Application): void {
  app.get(API_ROUTES.root, isAuthenticated, checkAccountStatus, isAuthorized, (_req, res) => {
    res.send(`Routes are active! route: ${API_ROUTES.root} with test ${test}`);
  });

  // Authentication routes with stricter rate limiting (no account status check - users need to login to get status updated)
  app.post(API_ROUTES.login, authRateLimit, isAuthenticated, isAuthorized, signInWithPassword);
  app.post(API_ROUTES.signUp, authRateLimit, isAuthenticated, isAuthorized, signUp);

  // User profile route - critical to check status here
  app.get(API_ROUTES.me, isAuthenticated, checkAccountStatus, isAuthorized, getCurrentUser);

  // Account management routes
  app.get(API_ROUTES.accounts, isAuthenticated, checkAccountStatus, isAuthorized, getAccounts);
  app.post(API_ROUTES.accounts, isAuthenticated, checkAccountStatus, isAuthorized, createAccount);

  app.get(API_ROUTES.accountById, isAuthenticated, checkAccountStatus, isAuthorized, getAccount);
  app.patch(API_ROUTES.accountById, isAuthenticated, checkAccountStatus, isAuthorized, updateAccount);

  // Profile endpoints removed - access profiles through workspace context (/me, /workspaces/:id, /workspaces/:id/members)

  // Workspace management routes - all require active account status
  app.get(API_ROUTES.workspaces, isAuthenticated, checkAccountStatus, isAuthorized, fetchWorkspacesByAccountId);
  app.post(API_ROUTES.workspaces, isAuthenticated, checkAccountStatus, isAuthorized, createWorkspace);

  app.get(API_ROUTES.workspaceById, isAuthenticated, checkAccountStatus, isAuthorized, fetchWorkspace);
  app.patch(API_ROUTES.workspaceById, isAuthenticated, checkAccountStatus, isAuthorized, updateWorkspace);
  app.delete(API_ROUTES.workspaceById, isAuthenticated, checkAccountStatus, isAuthorized, deleteWorkspace);

  // Member management routes - all require active account status
  app.get(API_ROUTES.workspaceMembers, isAuthenticated, checkAccountStatus, isAuthorized, getWorkspaceMembers);
  app.post(API_ROUTES.workspaceMembers, isAuthenticated, checkAccountStatus, isAuthorized, addWorkspaceMember);
  app.put(API_ROUTES.workspaceMemberRole, isAuthenticated, checkAccountStatus, isAuthorized, updateMemberRole);
  app.delete(API_ROUTES.workspaceMemberRemove, isAuthenticated, checkAccountStatus, isAuthorized, removeMember);
}
