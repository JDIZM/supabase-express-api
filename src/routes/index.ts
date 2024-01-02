import { Application } from "express";
import { test } from "@/helpers/index.js";
import { getUsers } from "@/handlers/users/users.handlers.js";

export const API_ROUTES = {
  root: "/",
  users: "/users"
};

export function routes(app: Application) {
  app.get(API_ROUTES.root, (req, res) => {
    res.send(`Routes are active! route: ${API_ROUTES.root} with test ${test}`);
  });
  app.get(API_ROUTES.users, getUsers);
}
