import type { Application } from "express";
import { isAuthenticated } from "@/middleware/isAuthenticated.ts";
import { isAuthorized } from "@/middleware/isAuthorized.ts";
import { test, permissions } from "@/helpers/index.ts";
import { signInWithPassword, signUp } from "@/handlers/auth/auth.handlers.js";
import {
  createWorkspace,
  fetchWorkspace,
  fetchWorkspacesByAccountId,
  updateWorkspace,
  deleteWorkspace
} from "@/handlers/workspaces/workspaces.handlers.ts";
import {
  addWorkspaceMember,
  updateMemberRole,
  removeMember
} from "@/handlers/memberships/memberships.handlers.ts";
import { getAccount, getAccounts, createAccount, updateAccount } from "@/handlers/accounts/accounts.handlers.ts";
import { getProfile, getProfiles } from "@/handlers/profiles/profiles.handlers.ts";
import { getCurrentUser } from "@/handlers/me/me.handlers.ts";

const { API_ROUTES } = permissions;

export function routes(app: Application): void {
  app.get(API_ROUTES.root, isAuthenticated, isAuthorized, (_req, res) => {
    res.send(`Routes are active! route: ${API_ROUTES.root} with test ${test}`);
  });
  app.post(API_ROUTES.login, isAuthenticated, isAuthorized, signInWithPassword);
  app.post(API_ROUTES.signUp, isAuthenticated, isAuthorized, signUp);

  app.get(API_ROUTES.me, isAuthenticated, isAuthorized, getCurrentUser);

  app.get(API_ROUTES.accounts, isAuthenticated, isAuthorized, getAccounts);
  app.post(API_ROUTES.accounts, isAuthenticated, isAuthorized, createAccount);

  app.get(API_ROUTES.accountById, isAuthenticated, isAuthorized, getAccount);
  app.patch(API_ROUTES.accountById, isAuthenticated, isAuthorized, updateAccount);

  app.get(API_ROUTES.profiles, isAuthenticated, isAuthorized, getProfiles);

  app.get(API_ROUTES.profileById, isAuthenticated, isAuthorized, getProfile);

  app.get(API_ROUTES.workspaces, isAuthenticated, isAuthorized, fetchWorkspacesByAccountId);
  app.post(API_ROUTES.workspaces, isAuthenticated, isAuthorized, createWorkspace);

  app.get(API_ROUTES.workspaceById, isAuthenticated, isAuthorized, fetchWorkspace);
  app.patch(API_ROUTES.workspaceById, isAuthenticated, isAuthorized, updateWorkspace);
  app.delete(API_ROUTES.workspaceById, isAuthenticated, isAuthorized, deleteWorkspace);

  // Member management routes
  app.post(API_ROUTES.workspaceMembers, isAuthenticated, isAuthorized, addWorkspaceMember);
  app.put(API_ROUTES.workspaceMemberRole, isAuthenticated, isAuthorized, updateMemberRole);
  app.delete(API_ROUTES.workspaceMemberRemove, isAuthenticated, isAuthorized, removeMember);
}
