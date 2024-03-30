import { describe, expect, it } from "vitest";
import { Claim, hasRoutesWithNoPermissionsSet, Route } from "./permissions.js";

const API_ROUTES = {
  root: "/",
  users: "/users",
  userById: "/users/:id"
} as const;

const permissions = new Map([
  ["/", []],
  ["/users", ["admin"]],
  ["/users/:id", ["owner"]]
]) as Map<Route, Claim[]>;

describe("permissions", () => {
  describe("hasRoutesWithNoPermissionsSet", () => {
    it("should return FALSE if all provided routes have permission levels set in the map", () => {
      const expected = hasRoutesWithNoPermissionsSet(Object.values(API_ROUTES), permissions);
      expect(expected).toBe(false);
    });

    it("should return TRUE if a route has no permissions set", () => {
      const API_ROUTES = {
        root: "/",
        users: "/users",
        userById: "/users/:id",
        example: "/example"
      } as const;

      const permissions = new Map([
        ["/", []],
        ["/users", ["admin"]],
        ["/user/:id", ["owner"]]
      ]) as Map<Route, Claim[]>;

      expect(hasRoutesWithNoPermissionsSet(Object.values(API_ROUTES) as Route[], permissions)).toBe(true);
    });
  });
});
