import { Application } from "express";
import { test } from "@/helpers/index.js";
import { signInWithPassword } from "@/handlers/auth/auth.handlers.js";
import { getUser, getUsers } from "@/handlers/users/users.handlers.js";
import { API_ROUTES } from "@/helpers/permissions.js";
import { isAuthenticated } from "@/middleware/isAuthenticated.js";
import { isAuthorized } from "@/middleware/isAuthorized.js";

export function routes(app: Application) {
  app.get(API_ROUTES.root, isAuthenticated, isAuthorized, (req, res) => {
    res.send(`Routes are active! route: ${API_ROUTES.root} with test ${test}`);
  });
  app.post(API_ROUTES.login, isAuthenticated, isAuthorized, signInWithPassword);
  app.get(API_ROUTES.users, isAuthenticated, isAuthorized, getUsers);
  app.get(API_ROUTES.userById, isAuthenticated, isAuthorized, getUser);
}
