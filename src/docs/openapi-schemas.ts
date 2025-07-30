import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

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
    status: z.enum(["active", "inactive", "suspended"]),
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

export const ProfileUpdateSchema = z
  .object({
    name: z.string().min(1).describe("New profile name for the workspace")
  })
  .openapi("ProfileUpdate");

// Response schemas - matches actual gatewayResponse helper output
export const SuccessResponseSchema = z
  .object({
    code: z.number().describe("HTTP status code"),
    message: z.string().describe("Success message"),
    data: z.unknown().describe("Response data")
  })
  .openapi("SuccessResponse");

export const ErrorResponseSchema = z
  .object({
    code: z.number().describe("HTTP status code"),
    message: z.string().describe("Error message"),
    error: z.string().describe("Error details")
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

export const AuditLogSchema = z
  .object({
    uuid: z.uuid(),
    action: z.string(),
    entityType: z.string(),
    entityId: z.uuid(),
    actorId: z.uuid(),
    actorEmail: z.string(),
    targetId: z.uuid().nullable(),
    targetEmail: z.string().nullable(),
    details: z.record(z.string(), z.unknown()).nullable(),
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
    workspaceId: z.uuid().nullable(),
    createdAt: z.string().datetime()
  })
  .openapi("AuditLog");

export const AuditLogStatsSchema = z
  .object({
    period: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    actionStats: z.array(
      z.object({
        action: z.string(),
        count: z.number()
      })
    ),
    entityTypeStats: z.array(
      z.object({
        entityType: z.string(),
        count: z.number()
      })
    ),
    topActors: z.array(
      z.object({
        actorId: z.uuid(),
        actorEmail: z.string(),
        count: z.number()
      })
    ),
    dailyActivity: z.array(
      z.object({
        date: z.string(),
        count: z.number()
      })
    )
  })
  .openapi("AuditLogStats");
