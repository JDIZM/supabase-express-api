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
  AuditLogStatsSchema
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
          schema: z.object({
            email: z.string().email().describe("User email address"),
            password: z.string().min(6).describe("User password")
          })
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
            data: z.object({
              token: z.string().describe("JWT access token"),
              account: AccountSchema
            })
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
          schema: z.object({
            email: z.string().email().describe("User email address"),
            password: z.string().min(6).describe("User password"),
            fullName: z.string().min(1).describe("User full name"),
            phone: z.string().optional().describe("User phone number")
          })
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
              token: z.string().describe("JWT access token"),
              account: AccountSchema
            })
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
            data: z.object({
              account: AccountSchema,
              workspaces: z.array(
                z.object({
                  workspace: WorkspaceSchema,
                  profile: ProfileSchema,
                  membership: MembershipSchema
                })
              ),
              workspaceCount: z.number()
            })
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
            data: z.object({
              workspace: WorkspaceSchema,
              profile: ProfileSchema,
              membership: MembershipSchema
            })
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
    params: z.object({
      id: z.uuid()
    }),
    headers: z.object({
      "x-workspace-id": z.uuid()
    })
  },
  responses: {
    200: {
      description: "Workspace details retrieved successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              workspace: WorkspaceSchema,
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
    params: z.object({
      id: z.uuid(),
      memberId: z.uuid()
    }),
    headers: z.object({
      "x-workspace-id": z.uuid()
    }),
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
    params: z.object({
      id: z.uuid(),
      memberId: z.uuid()
    }),
    headers: z.object({
      "x-workspace-id": z.uuid()
    })
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
    query: z.object({
      page: z.number().int().positive().default(1).describe("Page number for pagination"),
      limit: z.number().int().min(1).max(100).default(20).describe("Number of items per page")
    })
  },
  responses: {
    200: {
      description: "List of accounts with pagination",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              accounts: z.array(AccountSchema),
              pagination: PaginationSchema
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
    query: z.object({
      page: z.number().int().positive().default(1).describe("Page number for pagination"),
      limit: z.number().int().min(1).max(100).default(20).describe("Number of items per page")
    })
  },
  responses: {
    200: {
      description: "List of workspaces with pagination",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              workspaces: z.array(
                WorkspaceSchema.extend({
                  memberCount: z.number()
                })
              ),
              pagination: PaginationSchema
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
    query: z.object({
      page: z.number().int().positive().default(1).describe("Page number for pagination"),
      limit: z.number().int().min(1).max(100).default(20).describe("Number of items per page"),
      workspaceId: z.uuid().optional(),
      accountId: z.uuid().optional()
    })
  },
  responses: {
    200: {
      description: "List of memberships with pagination",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              memberships: z.array(
                z.object({
                  membership: MembershipSchema,
                  workspace: z.object({
                    uuid: z.uuid(),
                    name: z.string()
                  }),
                  account: z.object({
                    uuid: z.uuid(),
                    fullName: z.string(),
                    email: z.string().email()
                  })
                })
              ),
              pagination: PaginationSchema
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
  path: "/admin/audit-logs",
  summary: "List audit logs",
  description: "Get audit logs with filtering and pagination (SuperAdmin only)",
  security: [{ bearerAuth: [] }],
  tags: ["Admin"],
  request: {
    query: z.object({
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
  },
  responses: {
    200: {
      description: "List of audit logs with pagination and filters",
      content: {
        "application/json": {
          schema: SuccessResponseSchema.extend({
            data: z.object({
              auditLogs: z.array(
                z.object({
                  auditLog: AuditLogSchema,
                  actor: z
                    .object({
                      uuid: z.uuid(),
                      email: z.string(),
                      fullName: z.string()
                    })
                    .nullable(),
                  target: z
                    .object({
                      uuid: z.uuid(),
                      email: z.string(),
                      fullName: z.string()
                    })
                    .nullable(),
                  workspace: z
                    .object({
                      uuid: z.uuid(),
                      name: z.string()
                    })
                    .nullable()
                })
              ),
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
    query: z.object({
      days: z.number().int().min(1).max(365).default(30).describe("Number of days to analyze")
    })
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
