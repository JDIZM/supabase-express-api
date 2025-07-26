import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

// Extend Zod with OpenAPI functionality
extendZodWithOpenApi(z);

// Create OpenAPI-compatible versions of our database schemas
// These mirror the structure of our drizzle schemas but work with OpenAPI

export const AccountSchema = z
  .object({
    uuid: z.uuid(),
    fullName: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    isSuperAdmin: z.boolean(),
    createdAt: z.string().datetime()
  })
  .openapi("Account");

// Account creation (no isSuperAdmin field - security controlled server-side)
export const AccountCreateSchema = z
  .object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional()
  })
  .openapi("AccountCreate");

export const WorkspaceSchema = z
  .object({
    uuid: z.uuid(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.string().datetime(),
    accountId: z.uuid()
  })
  .openapi("Workspace");

export const WorkspaceCreateSchema = z
  .object({
    name: z.string().min(1).describe("Workspace name"),
    description: z.string().optional().describe("Optional workspace description")
  })
  .openapi("WorkspaceCreate");

export const ProfileSchema = z
  .object({
    uuid: z.uuid(),
    name: z.string(),
    createdAt: z.string().datetime(),
    workspaceId: z.uuid(),
    accountId: z.uuid()
  })
  .openapi("Profile");

export const MembershipSchema = z
  .object({
    uuid: z.uuid(),
    workspaceId: z.uuid(),
    accountId: z.uuid(),
    role: z.enum(["admin", "user"])
  })
  .openapi("Membership");

export const MemberCreateSchema = z
  .object({
    email: z.string().email().describe("Email of existing account to add"),
    role: z.enum(["admin", "user"]).describe("Role in the workspace"),
    profileName: z.string().optional().describe("Profile name for the workspace")
  })
  .openapi("MemberCreate");

// Response schemas
export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    code: z.number(),
    message: z.string(),
    data: z.unknown()
  })
  .openapi("SuccessResponse");

export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    code: z.number(),
    message: z.string(),
    error: z.string().optional()
  })
  .openapi("ErrorResponse");

export const PaginationSchema = z
  .object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().min(0),
    pages: z.number().int().min(0)
  })
  .openapi("Pagination");

// Parameter schemas
export const PaginationQuerySchema = z
  .object({
    page: z.number().int().positive().default(1).openapi({ description: "Page number for pagination" }),
    limit: z.number().int().min(1).max(100).default(20).openapi({ description: "Number of items per page" })
  })
  .openapi("PaginationQuery");

export const UuidParamSchema = z
  .object({
    id: z.uuid().openapi({ description: "UUID identifier" })
  })
  .openapi("UuidParam");
