import "express";

declare module "express" {
  interface Request {
    accountId?: string;
    workspaceId?: string;
  }
}
