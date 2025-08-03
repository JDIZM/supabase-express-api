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
    email: z.email(),
    phone: z.string().nullable(),
    isSuperAdmin: z.boolean(),
    status: z.enum(["active", "inactive", "suspended"]),
    createdAt: z.iso.datetime()
  })
  .openapi("Account");

// Account creation (no isSuperAdmin field - security controlled server-side)
export const AccountCreateSchema = z
  .object({
    fullName: z.string().min(1),
    email: z.email(),
    phone: z.string().optional()
  })
  .openapi("AccountCreate");

export const WorkspaceSchema = z
  .object({
    uuid: z.uuid(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.iso.datetime(),
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
    createdAt: z.iso.datetime(),
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
    email: z.email().describe("Email of existing account to add"),
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
    createdAt: z.iso.datetime()
  })
  .openapi("AuditLog");

export const AuditLogStatsSchema = z
  .object({
    period: z.string(),
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime(),
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

// Common parameter schemas
export const UuidParamOnlySchema = z
  .object({
    id: z.uuid().describe("UUID identifier")
  })
  .openapi("UuidParamOnly");

export const WorkspaceHeaderSchema = z
  .object({
    "x-workspace-id": z.uuid().describe("Workspace ID for context")
  })
  .openapi("WorkspaceHeader");

export const UuidParamsWithMemberSchema = z
  .object({
    id: z.uuid().describe("Workspace ID"),
    memberId: z.uuid().describe("Member ID")
  })
  .openapi("UuidParamsWithMember");

// Authentication request schemas
export const LoginRequestSchema = z
  .object({
    email: z.email().describe("User email address"),
    password: z.string().min(6).describe("User password")
  })
  .openapi("LoginRequest");

export const SignupRequestSchema = z
  .object({
    email: z.email().describe("User email address"),
    password: z.string().min(6).describe("User password"),
    fullName: z.string().min(1).describe("User full name"),
    phone: z.string().optional().describe("User phone number")
  })
  .openapi("SignupRequest");

// Role update schemas
export const MemberRoleUpdateSchema = z
  .object({
    role: z.enum(["admin", "user"]).describe("New role for the member")
  })
  .openapi("MemberRoleUpdate");

export const AdminRoleUpdateSchema = z
  .object({
    isSuperAdmin: z.boolean().describe("Whether the account should be a SuperAdmin")
  })
  .openapi("AdminRoleUpdate");

export const AccountStatusUpdateSchema = z
  .object({
    status: z.enum(["active", "inactive", "suspended"]).describe("New account status")
  })
  .openapi("AccountStatusUpdate");

// Common response data schemas
export const MessageResponseDataSchema = z
  .object({
    message: z.string().describe("Response message")
  })
  .openapi("MessageResponseData");

export const AccountResponseDataSchema = z
  .object({
    account: AccountSchema
  })
  .openapi("AccountResponseData");

export const WorkspaceResponseDataSchema = z
  .object({
    workspace: WorkspaceSchema
  })
  .openapi("WorkspaceResponseData");

export const ProfileResponseDataSchema = z
  .object({
    profile: ProfileSchema
  })
  .openapi("ProfileResponseData");

export const MembershipResponseDataSchema = z
  .object({
    membership: MembershipSchema
  })
  .openapi("MembershipResponseData");

// Authentication response data schemas
export const AuthTokenDataSchema = z
  .object({
    token: z.string().describe("JWT access token"),
    account: AccountSchema
  })
  .openapi("AuthTokenData");

// Complex composite schemas
export const WorkspaceMemberSchema = z
  .object({
    account: AccountSchema,
    profile: ProfileSchema,
    membership: MembershipSchema
  })
  .openapi("WorkspaceMember");

export const UserWorkspaceInfoSchema = z
  .object({
    workspace: WorkspaceSchema,
    profile: ProfileSchema,
    membership: MembershipSchema
  })
  .openapi("UserWorkspaceInfo");

export const WorkspaceWithMembersDataSchema = z
  .object({
    workspace: WorkspaceSchema,
    members: z.array(WorkspaceMemberSchema),
    memberCount: z.number().describe("Total number of workspace members")
  })
  .openapi("WorkspaceWithMembersData");

export const WorkspaceMembersDataSchema = z
  .object({
    members: z.array(WorkspaceMemberSchema),
    memberCount: z.number().describe("Total number of workspace members")
  })
  .openapi("WorkspaceMembersData");

export const CreateWorkspaceDataSchema = z
  .object({
    workspace: WorkspaceSchema,
    profile: ProfileSchema,
    membership: MembershipSchema
  })
  .openapi("CreateWorkspaceData");

export const UserProfileDataSchema = z
  .object({
    account: AccountSchema,
    workspaces: z.array(UserWorkspaceInfoSchema),
    workspaceCount: z.number().describe("Total number of user workspaces")
  })
  .openapi("UserProfileData");

// Admin query filters
export const AdminPaginationQuerySchema = z
  .object({
    page: z.number().int().positive().default(1).describe("Page number for pagination"),
    limit: z.number().int().min(1).max(100).default(20).describe("Number of items per page")
  })
  .openapi("AdminPaginationQuery");

export const AdminMembershipQuerySchema = z
  .object({
    page: z.number().int().positive().default(1).describe("Page number for pagination"),
    limit: z.number().int().min(1).max(100).default(20).describe("Number of items per page"),
    workspaceId: z.uuid().optional().describe("Filter by workspace ID"),
    accountId: z.uuid().optional().describe("Filter by account ID")
  })
  .openapi("AdminMembershipQuery");

export const AuditLogQuerySchema = z
  .object({
    page: z.number().int().positive().default(1).describe("Page number for pagination"),
    limit: z.number().int().min(1).max(100).default(50).describe("Number of items per page"),
    action: z.string().optional().describe("Filter by action type"),
    entityType: z.string().optional().describe("Filter by entity type"),
    actorId: z.uuid().optional().describe("Filter by actor ID"),
    entityId: z.uuid().optional().describe("Filter by entity ID"),
    workspaceId: z.uuid().optional().describe("Filter by workspace ID"),
    startDate: z.string().optional().describe("Filter by start date (ISO 8601)"),
    endDate: z.string().optional().describe("Filter by end date (ISO 8601)")
  })
  .openapi("AuditLogQuery");

export const AuditLogStatsQuerySchema = z
  .object({
    days: z.number().int().min(1).max(365).default(30).describe("Number of days to analyze")
  })
  .openapi("AuditLogStatsQuery");

// Simplified reference schemas for admin endpoints
export const SimpleAccountSchema = z
  .object({
    uuid: z.uuid(),
    email: z.email(),
    fullName: z.string()
  })
  .openapi("SimpleAccount");

export const SimpleWorkspaceSchema = z
  .object({
    uuid: z.uuid(),
    name: z.string()
  })
  .openapi("SimpleWorkspace");

// Standardized success response patterns
export const AccountsWithPaginationDataSchema = z
  .object({
    accounts: z.array(AccountSchema),
    pagination: PaginationSchema
  })
  .openapi("AccountsWithPaginationData");

export const WorkspacesWithPaginationDataSchema = z
  .object({
    workspaces: z.array(
      WorkspaceSchema.extend({
        memberCount: z.number().describe("Number of workspace members")
      })
    ),
    pagination: PaginationSchema
  })
  .openapi("WorkspacesWithPaginationData");

export const WorkspacesListDataSchema = z
  .object({
    data: z.array(WorkspaceSchema)
  })
  .openapi("WorkspacesListData");

// Audit log response schemas
export const AuditLogWithDetailsSchema = z
  .object({
    auditLog: AuditLogSchema,
    actor: SimpleAccountSchema.nullable(),
    target: SimpleAccountSchema.nullable(),
    workspace: SimpleWorkspaceSchema.nullable()
  })
  .openapi("AuditLogWithDetails");

export const AuditLogsWithPaginationDataSchema = z
  .object({
    auditLogs: z.array(AuditLogWithDetailsSchema),
    pagination: PaginationSchema,
    filters: z.object({
      action: z.string().nullable(),
      entityType: z.string().nullable(),
      actorId: z.uuid().nullable(),
      entityId: z.uuid().nullable(),
      workspaceId: z.uuid().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable()
    })
  })
  .openapi("AuditLogsWithPaginationData");

// Membership response schemas
export const MembershipWithDetailsSchema = z
  .object({
    membership: MembershipSchema,
    workspace: SimpleWorkspaceSchema,
    account: SimpleAccountSchema
  })
  .openapi("MembershipWithDetails");

export const MembershipsWithPaginationDataSchema = z
  .object({
    memberships: z.array(MembershipWithDetailsSchema),
    pagination: PaginationSchema
  })
  .openapi("MembershipsWithPaginationData");
