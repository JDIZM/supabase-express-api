import type { Application } from "express";
import { test, permissions } from "@/helpers/index.ts";
import {
  fetchWorkspacesHandler,
  createWorkspaceHandler,
  fetchWorkspaceHandler
} from "@/handlers/workspaces/workspaces.handlers.ts";
import { signInWithPassword, signUp } from "@/handlers/auth/auth.handlers.js";
import { getAccount, getAccounts, createAccount, updateAccount } from "@/handlers/accounts/accounts.handlers.ts";
import { isAuthenticated } from "@/middleware/isAuthenticated.ts";
import { isAuthorized } from "@/middleware/isAuthorized.ts";
import { createProfile, getProfile, getAllProfiles } from "@/handlers/profiles/profiles.handlers.ts";

const { API_ROUTES } = permissions;

export function routes(app: Application) {
  // @ts-expect-error no-unused-parameters
  app.get(API_ROUTES.root, isAuthenticated, isAuthorized, (req, res) => {
    res.send(`Routes are active! route: ${API_ROUTES.root} with test ${test}`);
  });
  app.post(API_ROUTES.login, isAuthenticated, isAuthorized, signInWithPassword);
  app.post(API_ROUTES.signUp, isAuthenticated, isAuthorized, signUp);

  app.get(API_ROUTES.accounts, isAuthenticated, isAuthorized, getAccounts);
  app.post(API_ROUTES.accounts, isAuthenticated, isAuthorized, createAccount);
  app.get(API_ROUTES.accountById, isAuthenticated, isAuthorized, getAccount);

  app.get(API_ROUTES.accountsAll, isAuthenticated, isAuthorized, getAccounts);
  app.put(API_ROUTES.accountById, isAuthenticated, isAuthorized, updateAccount);
  app.patch(API_ROUTES.accountById, isAuthenticated, isAuthorized, updateAccount);

  app.get(API_ROUTES.profiles, isAuthenticated, isAuthorized, getAllProfiles);
  app.post(API_ROUTES.profiles, isAuthenticated, isAuthorized, createProfile);
  app.get(API_ROUTES.profilesAll, isAuthenticated, isAuthorized, getAllProfiles);
  app.get(API_ROUTES.profileById, isAuthenticated, isAuthorized, getProfile);

  app.get(API_ROUTES.workspaces, isAuthenticated, isAuthorized, fetchWorkspacesHandler);
  app.post(API_ROUTES.workspaces, isAuthenticated, isAuthorized, createWorkspaceHandler);
  app.get(API_ROUTES.workspacesAll, isAuthenticated, isAuthorized, fetchWorkspacesHandler);
  app.get(API_ROUTES.workspaceById, isAuthenticated, isAuthorized, fetchWorkspaceHandler);
}
