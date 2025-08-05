import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { config } from "@/config.ts";
import {
  AccountSchema,
  AccountCreateSchema,
  WorkspaceSchema,
  WorkspaceCreateSchema,
  ProfileSchema,
  ProfileUpdateSchema,
  MembershipSchema,
  MemberCreateSchema,
  SuccessResponseSchema,
  ErrorResponseSchema,
  PaginationSchema,
  PaginationQuerySchema,
  UuidParamSchema,
  AuditLogSchema,
  AuditLogStatsSchema,
  // Parameter schemas
  UuidParamOnlySchema,
  WorkspaceHeaderSchema,
  UuidParamsWithMemberSchema,
  // Request schemas
  LoginRequestSchema,
  SignupRequestSchema,
  MemberRoleUpdateSchema,
  AdminRoleUpdateSchema,
  AccountStatusUpdateSchema,
  // Response data schemas
  MessageResponseDataSchema,
  AccountResponseDataSchema,
  WorkspaceResponseDataSchema,
  ProfileResponseDataSchema,
  MembershipResponseDataSchema,
  AuthTokenDataSchema,
  // Complex composite schemas
  WorkspaceMemberSchema,
  UserWorkspaceInfoSchema,
  WorkspaceWithMembersDataSchema,
  WorkspaceMembersDataSchema,
  CreateWorkspaceDataSchema,
  UserProfileDataSchema,
  // Query schemas
  AdminPaginationQuerySchema,
  AdminMembershipQuerySchema,
  AuditLogQuerySchema,
  AuditLogStatsQuerySchema,
  // Simple reference schemas
  SimpleAccountSchema,
  SimpleWorkspaceSchema,
  // Standardized response patterns
  AccountsWithPaginationDataSchema,
  WorkspacesWithPaginationDataSchema,
  WorkspacesListDataSchema,
  AuditLogWithDetailsSchema,
  AuditLogsWithPaginationDataSchema,
  MembershipWithDetailsSchema,
  MembershipsWithPaginationDataSchema
} from "./openapi-schemas.ts";

const registry = new OpenAPIRegistry();

// Register all schemas
registry.register("Account", AccountSchema);
registry.register("AccountCreate", AccountCreateSchema);
registry.register("PaginationQuery", PaginationQuerySchema);
registry.register("UuidParam", UuidParamSchema);
registry.register("Workspace", WorkspaceSchema);
registry.register("WorkspaceCreate", WorkspaceCreateSchema);
registry.register("Profile", ProfileSchema);
registry.register("ProfileUpdate", ProfileUpdateSchema);
registry.register("Membership", MembershipSchema);
registry.register("MemberCreate", MemberCreateSchema);
registry.register("SuccessResponse", SuccessResponseSchema);
registry.register("ErrorResponse", ErrorResponseSchema);
registry.register("Pagination", PaginationSchema);
registry.register("AuditLog", AuditLogSchema);
registry.register("AuditLogStats", AuditLogStatsSchema);

// Register parameter schemas
registry.register("UuidParamOnly", UuidParamOnlySchema);
registry.register("WorkspaceHeader", WorkspaceHeaderSchema);
registry.register("UuidParamsWithMember", UuidParamsWithMemberSchema);

// Register request schemas
registry.register("LoginRequest", LoginRequestSchema);
registry.register("SignupRequest", SignupRequestSchema);
registry.register("MemberRoleUpdate", MemberRoleUpdateSchema);
registry.register("AdminRoleUpdate", AdminRoleUpdateSchema);
registry.register("AccountStatusUpdate", AccountStatusUpdateSchema);

// Register response data schemas
registry.register("MessageResponseData", MessageResponseDataSchema);
registry.register("AccountResponseData", AccountResponseDataSchema);
registry.register("WorkspaceResponseData", WorkspaceResponseDataSchema);
registry.register("ProfileResponseData", ProfileResponseDataSchema);
registry.register("MembershipResponseData", MembershipResponseDataSchema);
registry.register("AuthTokenData", AuthTokenDataSchema);

// Register complex composite schemas
registry.register("WorkspaceMember", WorkspaceMemberSchema);
registry.register("UserWorkspaceInfo", UserWorkspaceInfoSchema);
registry.register("WorkspaceWithMembersData", WorkspaceWithMembersDataSchema);
registry.register("WorkspaceMembersData", WorkspaceMembersDataSchema);
registry.register("CreateWorkspaceData", CreateWorkspaceDataSchema);
registry.register("UserProfileData", UserProfileDataSchema);

// Register query schemas
registry.register("AdminPaginationQuery", AdminPaginationQuerySchema);
registry.register("AdminMembershipQuery", AdminMembershipQuerySchema);
registry.register("AuditLogQuery", AuditLogQuerySchema);
registry.register("AuditLogStatsQuery", AuditLogStatsQuerySchema);

// Register simple reference schemas
registry.register("SimpleAccount", SimpleAccountSchema);
registry.register("SimpleWorkspace", SimpleWorkspaceSchema);

// Register standardized response patterns
registry.register("AccountsWithPaginationData", AccountsWithPaginationDataSchema);
registry.register("WorkspacesWithPaginationData", WorkspacesWithPaginationDataSchema);
registry.register("WorkspacesListData", WorkspacesListDataSchema);
registry.register("AuditLogWithDetails", AuditLogWithDetailsSchema);
registry.register("AuditLogsWithPaginationData", AuditLogsWithPaginationDataSchema);
registry.register("MembershipWithDetails", MembershipWithDetailsSchema);
registry.register("MembershipsWithPaginationData", MembershipsWithPaginationDataSchema);

// Security scheme for JWT Bearer token
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT"
});

// Authentication routes
registry.registerPath({
  method: "post",
  path: "/login",
  summary: "User login",
  description: "Authenticate user with email and password",
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: AuthTokenDataSchema
          })
        }
      }
    },
    400: {
      description: "Invalid credentials",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/signup",
  summary: "User registration",
  description: "Create a new user account",
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: SignupRequestSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: "Account created successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: AuthTokenDataSchema
          })
        }
      }
    },
    400: {
      description: "Invalid input or email already exists",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

// Register API routes using Zod schemas
registry.registerPath({
  method: "get",
  path: "/me",
  summary: "Get current user profile",
  description: "Returns the current user's account information and all workspaces they belong to",
  security: [{ bearerAuth: [] }],
  tags: ["User"],
  responses: {
    200: {
      description: "Current user profile retrieved successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: UserProfileDataSchema
          })
        }
      }
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/workspaces",
  summary: "List user workspaces",
  description: "Get all workspaces that the current user is a member of",
  security: [{ bearerAuth: [] }],
  tags: ["Workspaces"],
  responses: {
    200: {
      description: "List of user workspaces",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.array(WorkspaceSchema)
          })
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/workspaces",
  summary: "Create new workspace",
  description: "Create a new workspace for the current user",
  security: [{ bearerAuth: [] }],
  tags: ["Workspaces"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: WorkspaceCreateSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "Workspace created successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: CreateWorkspaceDataSchema
          })
        }
      }
    }
  }
});

// Individual workspace operations
registry.registerPath({
  method: "get",
  path: "/workspaces/{id}",
  summary: "Get workspace details",
  description: "Get details of a specific workspace including all members",
  security: [{ bearerAuth: [] }],
  tags: ["Workspaces"],
  request: {
    params: UuidParamOnlySchema,
    headers: WorkspaceHeaderSchema
  },
  responses: {
    200: {
      description: "Workspace details retrieved successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: WorkspaceWithMembersDataSchema
          })
        }
      }
    },
    404: {
      description: "Workspace not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "patch",
  path: "/workspaces/{id}",
  summary: "Update workspace",
  description: "Update workspace details (Admin only)",
  security: [{ bearerAuth: [] }],
  tags: ["Workspaces"],
  request: {
    params: z.object({
      id: z.uuid()
    }),
    headers: z.object({
      "x-workspace-id": z.uuid()
    }),
    body: {
      content: {
        "application/json": {
          schema: WorkspaceCreateSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "Workspace updated successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              workspace: WorkspaceSchema
            })
          })
        }
      }
    }
  }
});

registry.registerPath({
  method: "delete",
  path: "/workspaces/{id}",
  summary: "Delete workspace",
  description: "Delete a workspace and all its data (Admin only)",
  security: [{ bearerAuth: [] }],
  tags: ["Workspaces"],
  request: {
    params: z.object({
      id: z.uuid()
    }),
    headers: z.object({
      "x-workspace-id": z.uuid()
    })
  },
  responses: {
    200: {
      description: "Workspace deleted successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              message: z.string()
            })
          })
        }
      }
    }
  }
});

registry.registerPath({
  method: "patch",
  path: "/workspaces/{id}/profile",
  summary: "Update workspace profile",
  description: "Update the current user's profile name within a workspace. Users can only update their own profile.",
  security: [{ bearerAuth: [] }],
  tags: ["Workspaces"],
  request: {
    params: z.object({
      id: z.uuid().describe("Workspace ID")
    }),
    headers: z.object({
      "x-workspace-id": z.uuid().describe("Workspace ID for context")
    }),
    body: {
      content: {
        "application/json": {
          schema: ProfileUpdateSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: "Profile updated successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              profile: ProfileSchema
            })
          })
        }
      }
    },
    400: {
      description: "Validation failed",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    404: {
      description: "Profile not found in workspace",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "put",
  path: "/workspaces/{id}/members/{memberId}/role",
  summary: "Update member role",
  description: "Update a workspace member's role (Admin only)",
  security: [{ bearerAuth: [] }],
  tags: ["Members"],
  request: {
    params: UuidParamsWithMemberSchema,
    headers: WorkspaceHeaderSchema,
    body: {
      content: {
        "application/json": {
          schema: z.object({
            role: z.enum(["admin", "user"]).describe("New role for the member")
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: "Member role updated successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              membership: MembershipSchema
            })
          })
        }
      }
    }
  }
});

registry.registerPath({
  method: "delete",
  path: "/workspaces/{id}/members/{memberId}",
  summary: "Remove workspace member",
  description: "Remove a member from the workspace (Admin only)",
  security: [{ bearerAuth: [] }],
  tags: ["Members"],
  request: {
    params: UuidParamsWithMemberSchema,
    headers: WorkspaceHeaderSchema
  },
  responses: {
    200: {
      description: "Member removed successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              message: z.string()
            })
          })
        }
      }
    }
  }
});

// Admin routes using Zod schemas
registry.registerPath({
  method: "get",
  path: "/admin/accounts",
  summary: "List all accounts (SuperAdmin only)",
  description: "Get a paginated list of all accounts in the system",
  security: [{ bearerAuth: [] }],
  tags: ["Admin"],
  request: {
    query: AdminPaginationQuerySchema
  },
  responses: {
    200: {
      description: "List of accounts with pagination",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: AccountsWithPaginationDataSchema
          })
        }
      }
    },
    403: {
      description: "Forbidden - SuperAdmin access required",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/admin/accounts",
  summary: "Create account for user (SuperAdmin only)",
  description: "Create a new account for an existing user",
  security: [{ bearerAuth: [] }],
  tags: ["Admin"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: AccountCreateSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: "Account created successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              account: AccountSchema
            })
          })
        }
      }
    },
    403: {
      description: "Forbidden - SuperAdmin access required",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/admin/workspaces",
  summary: "List all workspaces (SuperAdmin only)",
  description: "Get a paginated list of all workspaces in the system",
  security: [{ bearerAuth: [] }],
  tags: ["Admin"],
  request: {
    query: AdminPaginationQuerySchema
  },
  responses: {
    200: {
      description: "List of workspaces with pagination",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: WorkspacesWithPaginationDataSchema
          })
        }
      }
    },
    403: {
      description: "Forbidden - SuperAdmin access required",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/workspaces/{id}/members",
  summary: "List workspace members",
  description: "Get all members of a specific workspace",
  security: [{ bearerAuth: [] }],
  tags: ["Members"],
  request: {
    params: z.object({
      id: z.uuid()
    }),
    headers: z.object({
      "x-workspace-id": z.uuid()
    })
  },
  responses: {
    200: {
      description: "List of workspace members",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              members: z.array(
                z.object({
                  account: AccountSchema,
                  profile: ProfileSchema,
                  membership: MembershipSchema
                })
              ),
              memberCount: z.number()
            })
          })
        }
      }
    },
    404: {
      description: "Workspace not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/workspaces/{id}/members",
  summary: "Add workspace member",
  description: "Add a new member to a workspace",
  security: [{ bearerAuth: [] }],
  tags: ["Members"],
  request: {
    params: z.object({
      id: z.uuid()
    }),
    headers: z.object({
      "x-workspace-id": z.uuid()
    }),
    body: {
      content: {
        "application/json": {
          schema: MemberCreateSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: "Member added successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              account: AccountSchema,
              profile: ProfileSchema,
              membership: MembershipSchema
            })
          })
        }
      }
    },
    404: {
      description: "Workspace or account not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "put",
  path: "/admin/accounts/{id}/role",
  summary: "Update account SuperAdmin status",
  description: "Promote or demote an account's SuperAdmin status (SuperAdmin only)",
  security: [{ bearerAuth: [] }],
  tags: ["Admin"],
  request: {
    params: z.object({
      id: z.uuid()
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            isSuperAdmin: z.boolean().describe("Whether the account should be a SuperAdmin")
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: "Account role updated successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              account: AccountSchema
            })
          })
        }
      }
    },
    403: {
      description: "Forbidden - SuperAdmin access required",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "put",
  path: "/admin/accounts/{id}/status",
  summary: "Update account status",
  description: "Activate, deactivate, or suspend an account (SuperAdmin only)",
  security: [{ bearerAuth: [] }],
  tags: ["Admin"],
  request: {
    params: z.object({
      id: z.uuid()
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.enum(["active", "inactive", "suspended"]).describe("New account status")
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: "Account status updated successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              account: AccountSchema
            })
          })
        }
      }
    },
    400: {
      description: "Invalid status value",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    403: {
      description: "Forbidden - SuperAdmin access required",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    },
    404: {
      description: "Account not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

// SuperAdmin workspace control endpoints removed - users manage their own workspaces

registry.registerPath({
  method: "get",
  path: "/admin/memberships",
  summary: "List all memberships",
  description: "Get all workspace memberships with optional filtering (SuperAdmin only)",
  security: [{ bearerAuth: [] }],
  tags: ["Admin"],
  request: {
    query: AdminMembershipQuerySchema
  },
  responses: {
    200: {
      description: "List of memberships with pagination",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: MembershipsWithPaginationDataSchema
          })
        }
      }
    },
    403: {
      description: "Forbidden - SuperAdmin access required",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/admin/audit-logs",
  summary: "List audit logs",
  description: "Get audit logs with filtering and pagination (SuperAdmin only)",
  security: [{ bearerAuth: [] }],
  tags: ["Admin"],
  request: {
    query: AuditLogQuerySchema
  },
  responses: {
    200: {
      description: "List of audit logs with pagination and filters",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: AuditLogsWithPaginationDataSchema
          })
        }
      }
    },
    403: {
      description: "Forbidden - SuperAdmin access required",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/admin/audit-logs/stats",
  summary: "Get audit log statistics",
  description: "Get audit log statistics and analytics (SuperAdmin only)",
  security: [{ bearerAuth: [] }],
  tags: ["Admin"],
  request: {
    query: AuditLogStatsQuerySchema
  },
  responses: {
    200: {
      description: "Audit log statistics",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: AuditLogStatsSchema
          })
        }
      }
    },
    403: {
      description: "Forbidden - SuperAdmin access required",
      content: {
        "application/json": {
          schema: ErrorResponseSchema
        }
      }
    }
  }
});

export function generateOpenAPIDocument(): ReturnType<OpenApiGeneratorV3["generateDocument"]> {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Supabase Express API",
      description: `A multi-tenant workspace API with role-based access control.
      
## Authorization Pattern

This API uses a consistent header-based authorization for workspace operations:

- **JWT Bearer Token**: Include in Authorization header for authentication
- **x-workspace-id Header**: Required for ALL workspace-scoped endpoints, even when workspace ID is in the URL

### Why Headers?
- Consistent authorization pattern across all endpoints
- Supports future endpoints without workspace ID in URL  
- Explicit workspace context for security
- Extensible for additional context headers

### Profile Data Access
Individual profile endpoints have been removed. Access profiles through workspace context:
- GET /me - Your profiles across all workspaces
- GET /workspaces/{id} - Workspace with all member profiles
- GET /workspaces/{id}/members - Dedicated member listing
- PATCH /workspaces/{id}/profile - Update your own profile in workspace`,
      contact: {
        name: "API Support",
        email: "support@example.com"
      }
    },
    servers: [
      {
        url: config.appUrl,
        description: config.env === "production" ? "Production server" : "Development server"
      }
    ],
    tags: [
      { name: "Authentication", description: "User authentication endpoints" },
      { name: "User", description: "User profile operations" },
      { name: "Workspaces", description: "Workspace management" },
      { name: "Members", description: "Workspace member management" },
      { name: "Admin", description: "SuperAdmin operations" }
    ]
  });
}
