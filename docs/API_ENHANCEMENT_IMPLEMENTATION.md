# API Enhancement Implementation Guide

> **Status: proposal, not a description of the API.** This is a design
> document written up-front; large parts of it were never built, and the
> wording throughout is "recommended"/"should be" rather than "does".
> Treat it as a backlog and a record of the reasoning. For what the API
> actually exposes, see [FEATURES.md](FEATURES.md) and the generated
> OpenAPI document at `/api-docs`.

## Executive Summary

This document provides a comprehensive implementation guide for enhancing the Supabase Express API with complete endpoint coverage, Swagger documentation, and proper security middleware. The current API has basic functionality but lacks admin-level operations, proper documentation, and enhanced security measures.

### Key Enhancements Required:

- **Missing `/admin` SuperAdmin routes** for cross-account operations
- **Incomplete regular workspace endpoints** for member management
- **Swagger/OpenAPI documentation** for API discoverability
- **Security middleware** (rate limiting, audit logging) for admin operations

## Current API Analysis

### Existing Endpoints

#### Authentication Routes

- `POST /login` - Sign in with password
- `POST /signup` - Create new account

#### Account Management

- `GET /accounts` - List all accounts (SuperAdmin only)
- `POST /accounts` - Create account (SuperAdmin only)
- `GET /accounts/:id` - Get account details (Owner only)
- `PATCH /accounts/:id` - Update account (Owner only)

#### Profile Management

- `GET /profiles` - List profiles (authenticated)
- `GET /profiles/:id` - Get profile details (Owner only)

#### Workspace Management

- `GET /workspaces` - List user's workspaces (authenticated)
- `POST /workspaces` - Create workspace (authenticated)
- `GET /workspaces/:id` - Get workspace details (User role required)
- `PATCH /workspaces/:id` - Update workspace (stub implementation)

### Current Permission System

#### Three-Tier Permission Structure:

1. **SuperAdmin** (`isSuperAdmin: true` in accounts table)

   - **Current access**: `/accounts` routes only
   - **Scope**: System-wide, cross-account operations
   - **Missing**: `/admin` prefixed routes for workspace management

2. **Workspace Admin** (`role: "admin"` in workspace_memberships table)

   - **Current access**: Can manage resources within their workspace
   - **Scope**: Limited to workspaces they have admin role in
   - **Missing**: Member management, workspace deletion

3. **Workspace User** (`role: "user"` in workspace_memberships table)
   - **Current access**: Basic workspace access
   - **Scope**: Read-only operations within workspace

### Security Middleware Status

#### ✅ Currently Implemented:

- **helmet** (v8.0.0) - Security headers
- **cors** - Cross-origin resource sharing with custom config
- **pino/pino-http** - Request logging
- **isAuthenticated** - JWT token validation
- **isAuthorized** - Role-based access control

#### ❌ Missing for Admin Routes:

- **auditLogger** - Detailed admin action logging
- **rateLimiter** - Rate limiting middleware (no express-rate-limit package)
- **Enhanced admin protection** - Additional security layers

## Missing `/admin` SuperAdmin Routes

### Account Management (Partial Implementation)

Current `/accounts` routes are SuperAdmin-only but need `/admin` prefix for consistency:

- `GET /admin/accounts` - List all accounts with pagination
- `POST /admin/accounts` - Create account with optional Supabase sync
- `PUT /admin/accounts/:id/role` - Promote/demote admin status
- `PUT /admin/accounts/:id/status` - Activate/deactivate account

### Workspace Management (Missing)

Cross-account workspace operations for SuperAdmin:

- `GET /admin/workspaces` - List ALL workspaces across accounts
- `POST /admin/workspaces` - Create workspace for ANY account
- `PUT /admin/workspaces/:id` - Update ANY workspace
- `DELETE /admin/workspaces/:id` - Delete ANY workspace
- `POST /admin/workspaces/:id/invite` - Invite users to ANY workspace

### Membership Management (Missing)

Cross-workspace membership operations for SuperAdmin:

- `GET /admin/memberships` - List all memberships with filtering
- `PUT /admin/memberships/:id/role` - Change member role in ANY workspace
- `DELETE /admin/memberships/:id` - Remove membership from ANY workspace

## Missing Regular Workspace Endpoints

### Current Gaps in Workspace Management:

- `DELETE /workspaces/:id` - Delete own workspace
- Complete `PATCH /workspaces/:id` - Update workspace details (currently stub)
- `POST /workspaces/:id/invite` - Invite users to own workspace
- `PUT /workspaces/:id/members/:memberId/role` - Change member roles
- `DELETE /workspaces/:id/members/:memberId` - Remove members

### Member Management Routes (Missing)

- `GET /workspaces/:id/members` - List workspace members
- `POST /workspaces/:id/members` - Add existing user to workspace
- `GET /workspaces/:id/members/:memberId` - Get member details
- `PUT /workspaces/:id/members/:memberId/role` - Update member role
- `DELETE /workspaces/:id/members/:memberId` - Remove member

## Admin vs Regular Route Distinction

### `/admin/*` Routes (SuperAdmin Only)

- **Purpose**: Cross-account system administration
- **Scope**: Can operate on ANY account's resources
- **Security**: Enhanced audit logging, stricter rate limiting
- **Examples**:
  - `POST /admin/workspaces` - Create workspace for any account
  - `DELETE /admin/workspaces/:id` - Delete any workspace

### Regular Routes (Workspace-Scoped)

- **Purpose**: Self-service operations within user's access
- **Scope**: Limited to user's own resources or workspaces they're members of
- **Security**: Standard authentication and authorization
- **Examples**:
  - `POST /workspaces` - Create workspace for own account
  - `DELETE /workspaces/:id` - Delete own workspace

## Swagger Integration Plan

### Package Selection: `zod-to-openapi` + `swagger-ui-express`

#### Why This Approach:

- **Leverages existing Zod schemas** for validation
- **Single source of truth** for validation and documentation
- **Type safety** maintained between validation and docs
- **Automatic schema generation** from existing code

#### Implementation Steps:

1. **Install Dependencies**:

   ```bash
   pnpm add zod-to-openapi swagger-ui-express
   pnpm add -D @types/swagger-ui-express
   ```

2. **Create OpenAPI Generator**:

   ```typescript
   // src/docs/openapi.ts
   import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
   import { accountInsertSchema, workspaceInsertSchema } from "@/schema.ts";

   const registry = new OpenAPIRegistry();

   // Register schemas
   registry.register("Account", accountInsertSchema);
   registry.register("Workspace", workspaceInsertSchema);

   // Register endpoints
   registry.registerPath({
     method: "get",
     path: "/workspaces",
     summary: "List user workspaces",
     responses: {
       200: {
         description: "List of workspaces",
         content: {
           "application/json": {
             schema: { type: "array", items: { $ref: "#/components/schemas/Workspace" } }
           }
         }
       }
     }
   });
   ```

3. **Setup Swagger UI**:

   ```typescript
   // src/docs/swagger.ts
   import swaggerUi from "swagger-ui-express";
   import { generateOpenAPIDocument } from "./openapi.ts";

   export const setupSwagger = (app: Application) => {
     const document = generateOpenAPIDocument();
     app.use("/docs", swaggerUi.serve);
     app.get("/docs", swaggerUi.setup(document));
   };
   ```

#### Route Documentation Examples:

```typescript
// Admin routes with enhanced documentation
registry.registerPath({
  method: "post",
  path: "/admin/workspaces",
  summary: "Create workspace for any account (SuperAdmin only)",
  security: [{ bearerAuth: [] }],
  tags: ["Admin - Workspaces"],
  requestBody: {
    content: {
      "application/json": {
        schema: workspaceCreateSchema
      }
    }
  },
  responses: {
    201: {
      description: "Workspace created successfully",
      content: {
        "application/json": {
          schema: workspaceResponseSchema
        }
      }
    },
    403: {
      description: "Forbidden - SuperAdmin access required"
    }
  }
});
```

## Security Enhancement Requirements

### Rate Limiting Implementation

#### Package Installation:

```bash
pnpm add express-rate-limit
```

#### Configuration:

```typescript
// src/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";

export const standardRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // stricter limit for admin operations
  message: "Too many admin requests from this IP, please try again later."
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // very strict for auth operations
  message: "Too many authentication attempts, please try again later."
});
```

### Audit Logging Implementation

#### Database Schema:

```sql
-- Migration: Add audit_logs table
CREATE TABLE audit_logs (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_account_id UUID NOT NULL REFERENCES accounts(uuid),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL, -- 'account', 'workspace', 'membership'
  target_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin_account_id ON audit_logs(admin_account_id);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

#### Middleware Implementation:

```typescript
// src/middleware/auditLogger.ts
import { Request, Response, NextFunction } from "express";
import { db } from "@/services/db/drizzle.ts";
import { auditLogs } from "@/schema.ts";

export const auditLogger = (action: string, targetType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function (data) {
      // Log successful admin actions
      if (res.statusCode < 400) {
        logAdminAction({
          adminAccountId: req.accountId!,
          action,
          targetType,
          targetId: req.params.id || req.body.id,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          requestBody: req.body,
          responseData: data
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

async function logAdminAction(logData: AuditLogData) {
  await db.insert(auditLogs).values({
    adminAccountId: logData.adminAccountId,
    action: logData.action,
    targetType: logData.targetType,
    targetId: logData.targetId,
    newValue: logData.requestBody,
    ipAddress: logData.ipAddress,
    userAgent: logData.userAgent
  });
}
```

### Enhanced Admin Route Security

#### Middleware Chain:

```typescript
// src/routes/admin.ts
import { adminRateLimit } from "@/middleware/rateLimiter.ts";
import { auditLogger } from "@/middleware/auditLogger.ts";
import { isAuthenticated } from "@/middleware/isAuthenticated.ts";
import { isAuthorized } from "@/middleware/isAuthorized.ts";

app.use("/admin", [
  adminRateLimit,
  isAuthenticated,
  isAuthorized
  // Additional admin-specific middleware
]);

app.post("/admin/workspaces", auditLogger("create_workspace", "workspace"), createWorkspaceForAccount);
```

## Complete API Endpoint Matrix

### Current Implementation Status

| Endpoint          | Method | Current Status | Permission Required | Notes                |
| ----------------- | ------ | -------------- | ------------------- | -------------------- |
| `/accounts`       | GET    | ✅ Implemented | SuperAdmin          | List all accounts    |
| `/accounts`       | POST   | ✅ Implemented | SuperAdmin          | Create account       |
| `/accounts/:id`   | GET    | ✅ Implemented | Owner               | Get account details  |
| `/accounts/:id`   | PATCH  | ✅ Implemented | Owner               | Update account       |
| `/workspaces`     | GET    | ✅ Implemented | Authenticated       | List user workspaces |
| `/workspaces`     | POST   | ✅ Implemented | Authenticated       | Create workspace     |
| `/workspaces/:id` | GET    | ✅ Implemented | User                | Get workspace        |
| `/workspaces/:id` | PATCH  | ⚠️ Stub        | Admin               | Update workspace     |
| `/workspaces/:id` | DELETE | ❌ Missing     | Admin               | Delete workspace     |
| `/profiles`       | GET    | ✅ Implemented | Authenticated       | List profiles        |
| `/profiles/:id`   | GET    | ✅ Implemented | Owner               | Get profile          |

### Missing Regular Endpoints

| Endpoint                            | Method | Status     | Permission Required | Implementation Needed    |
| ----------------------------------- | ------ | ---------- | ------------------- | ------------------------ |
| `/workspaces/:id`                   | DELETE | ❌ Missing | Admin               | Delete own workspace     |
| `/workspaces/:id/members`           | GET    | ❌ Missing | User                | List workspace members   |
| `/workspaces/:id/members`           | POST   | ❌ Missing | Admin               | Add member to workspace  |
| `/workspaces/:id/members/:memberId` | PUT    | ❌ Missing | Admin               | Update member role       |
| `/workspaces/:id/members/:memberId` | DELETE | ❌ Missing | Admin               | Remove member            |
| `/workspaces/:id/invite`            | POST   | ❌ Missing | Admin               | Invite user to workspace |

### Missing Admin Endpoints

| Endpoint                       | Method | Status     | Permission Required | Implementation Needed            |
| ------------------------------ | ------ | ---------- | ------------------- | -------------------------------- |
| `/admin/accounts`              | GET    | ❌ Missing | SuperAdmin          | List all accounts (paginated)    |
| `/admin/accounts`              | POST   | ❌ Missing | SuperAdmin          | Create account for any user      |
| `/admin/accounts/:id/role`     | PUT    | ❌ Missing | SuperAdmin          | Promote/demote admin             |
| `/admin/accounts/:id/status`   | PUT    | ❌ Missing | SuperAdmin          | Activate/deactivate              |
| `/admin/workspaces`            | GET    | ❌ Missing | SuperAdmin          | List ALL workspaces              |
| `/admin/workspaces`            | POST   | ❌ Missing | SuperAdmin          | Create workspace for any account |
| `/admin/workspaces/:id`        | PUT    | ❌ Missing | SuperAdmin          | Update any workspace             |
| `/admin/workspaces/:id`        | DELETE | ❌ Missing | SuperAdmin          | Delete any workspace             |
| `/admin/workspaces/:id/invite` | POST   | ❌ Missing | SuperAdmin          | Invite to any workspace          |
| `/admin/memberships`           | GET    | ❌ Missing | SuperAdmin          | List all memberships             |
| `/admin/memberships/:id/role`  | PUT    | ❌ Missing | SuperAdmin          | Change any member role           |
| `/admin/memberships/:id`       | DELETE | ❌ Missing | SuperAdmin          | Remove any membership            |

## Database Schema Updates

### Required Tables

#### Audit Logs Table:

```typescript
// src/schema.ts - Add to existing schema
export const auditLogs = pgTable("audit_logs", {
  uuid: uuid("uuid").defaultRandom().primaryKey(),
  adminAccountId: uuid("admin_account_id")
    .notNull()
    .references(() => accounts.uuid),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: uuid("target_id").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).defaultNow()
});

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
  adminAccount: one(accounts, {
    fields: [auditLogs.adminAccountId],
    references: [accounts.uuid]
  })
}));

export const auditLogInsertSchema = createInsertSchema(auditLogs);
export const auditLogSelectSchema = createSelectSchema(auditLogs);
export type AuditLogInsertType = InferInsertModel<typeof auditLogs>;
export type AuditLogSelectType = InferSelectModel<typeof auditLogs>;
```

#### Performance Indexes:

```sql
-- Migration: Add indexes for audit logs
CREATE INDEX idx_audit_logs_admin_account_id ON audit_logs(admin_account_id);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### Migration Script:

```typescript
// migrations/add_audit_logs.ts
import { sql } from "drizzle-orm";

export async function up() {
  await sql`
    CREATE TABLE audit_logs (
      uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_account_id UUID NOT NULL REFERENCES accounts(uuid) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50) NOT NULL,
      target_id UUID NOT NULL,
      old_value JSONB,
      new_value JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX idx_audit_logs_admin_account_id ON audit_logs(admin_account_id);
    CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
    CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
  `;
}

export async function down() {
  await sql`DROP TABLE audit_logs`;
}
```

## Implementation Phases

### Phase 1: Foundation Setup (New Branch: `feature/swagger-api-docs`)

#### 1.1 Install Dependencies

```bash
# Swagger dependencies
pnpm add zod-to-openapi swagger-ui-express
pnpm add -D @types/swagger-ui-express

# Security dependencies
pnpm add express-rate-limit
pnpm add -D @types/express-rate-limit
```

#### 1.2 Setup Swagger Documentation

- Create `src/docs/` directory structure
- Implement OpenAPI schema generation
- Setup Swagger UI endpoint at `/docs`
- Document existing endpoints

#### 1.3 Implement Security Middleware

- Create rate limiting middleware with different tiers
- Implement audit logging middleware
- Add database migration for audit logs

#### 1.4 Update Route Permissions

- Add `/admin` prefix to API_ROUTES
- Update permissions.ts with admin routes
- Ensure proper authorization checks

### Phase 2: Complete Regular Endpoints

#### 2.1 Finish Workspace CRUD

- Complete `PATCH /workspaces/:id` implementation
- Add `DELETE /workspaces/:id` endpoint
- Add proper validation and error handling

#### 2.2 Implement Member Management

- `GET /workspaces/:id/members` - List members
- `POST /workspaces/:id/members` - Add member
- `PUT /workspaces/:id/members/:memberId/role` - Update role
- `DELETE /workspaces/:id/members/:memberId` - Remove member
- `POST /workspaces/:id/invite` - Invite user

#### 2.3 Add Comprehensive Testing

- Unit tests for all handlers
- Integration tests for permission scenarios
- Test workspace-scoped operations

### Phase 3: Implement `/admin` SuperAdmin Routes

#### 3.1 Admin Account Management

- `GET /admin/accounts` - List all accounts with pagination
- `POST /admin/accounts` - Create account for any user
- `PUT /admin/accounts/:id/role` - Promote/demote admin
- `PUT /admin/accounts/:id/status` - Activate/deactivate

#### 3.2 Admin Workspace Management

- `GET /admin/workspaces` - List ALL workspaces
- `POST /admin/workspaces` - Create workspace for any account
- `PUT /admin/workspaces/:id` - Update any workspace
- `DELETE /admin/workspaces/:id` - Delete any workspace
- `POST /admin/workspaces/:id/invite` - Invite to any workspace

#### 3.3 Admin Membership Management

- `GET /admin/memberships` - List all memberships
- `PUT /admin/memberships/:id/role` - Change any member role
- `DELETE /admin/memberships/:id` - Remove any membership

#### 3.4 Enhanced Security for Admin Routes

- Apply audit logging to all admin operations
- Implement stricter rate limiting
- Add additional validation layers

### Phase 4: Testing, Documentation, and Deployment

#### 4.1 Comprehensive Testing

- Unit tests for all new endpoints
- Integration tests for admin vs regular permissions
- Performance tests for rate limiting
- Security tests for audit logging

#### 4.2 Documentation Updates

- Complete Swagger documentation for all endpoints
- Update README.md with new capabilities
- Add development setup for admin users
- Document permission matrix

#### 4.3 Deployment Preparation

- Environment variable updates
- Database migration scripts
- Monitoring and alerting setup
- Security review and penetration testing

## Code Examples & Patterns

### Admin Route Handler Pattern

```typescript
// src/handlers/admin/admin.handlers.ts
import { Request, Response } from "express";
import { asyncHandler } from "@/helpers/request.ts";
import { auditLogger } from "@/middleware/auditLogger.ts";
import { adminRateLimit } from "@/middleware/rateLimiter.ts";

export const createWorkspaceForAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { accountId, name, description } = req.body;

  // Validate input
  const validatedData = workspaceCreateSchema.parse(req.body);

  // Check if target account exists
  const targetAccount = await db.select().from(accounts).where(eq(accounts.uuid, accountId)).limit(1);

  if (!targetAccount.length) {
    throw new Error("Target account not found");
  }

  // Create workspace
  const workspace = await createDbWorkspace({
    name: validatedData.name,
    description: validatedData.description,
    accountId: validatedData.accountId
  });

  // Create admin membership for target account
  const membership = await createMembership(workspace.uuid, accountId, "admin");

  // Create profile for target account
  const profile = await createDbProfile({
    name: targetAccount[0].fullName,
    accountId,
    workspaceId: workspace.uuid
  });

  const response = gatewayResponse().success(
    201,
    { workspace, membership, profile },
    "Admin created workspace successfully"
  );

  res.status(response.code).send(response);
});
```

### Swagger Schema Integration

```typescript
// src/docs/schemas.ts
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const workspaceCreateSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    accountId: z.uuid()
  })
  .openapi({
    example: {
      name: "Client Project Workspace",
      description: "Workspace for client collaboration",
      accountId: "123e4567-e89b-12d3-a456-426614174000"
    }
  });

export const adminWorkspaceResponseSchema = z
  .object({
    workspace: workspaceSelectSchema,
    membership: workspaceMembershipSelectSchema,
    profile: profileSelectSchema
  })
  .openapi({
    description: "Admin workspace creation response"
  });
```

### Rate Limiting Configuration

```typescript
// src/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";
import { logger } from "@/helpers/logger.ts";

export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req, res) => {
      logger.warn(
        {
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          path: req.path,
          method: req.method
        },
        "Rate limit exceeded"
      );

      res.status(429).json({
        error: "Too Many Requests",
        message: options.message,
        retryAfter: Math.round(options.windowMs / 1000)
      });
    }
  });
};

export const adminRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes for admin operations
  message: "Too many admin requests from this IP, please try again later.",
  skipSuccessfulRequests: true
});
```

### Testing Patterns

```typescript
// tests/admin.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { testServer } from "./helpers/testServer.ts";
import { createTestUser } from "./helpers/createTestUser.ts";

describe("Admin Endpoints", () => {
  let superAdminToken: string;
  let regularUserToken: string;

  beforeEach(async () => {
    superAdminToken = await createTestUser({ isSuperAdmin: true });
    regularUserToken = await createTestUser({ isSuperAdmin: false });
  });

  describe("POST /admin/workspaces", () => {
    it("should allow SuperAdmin to create workspace for any account", async () => {
      const response = await testServer
        .post("/admin/workspaces")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          name: "Admin Created Workspace",
          accountId: "target-account-id"
        });

      expect(response.status).toBe(201);
      expect(response.body.data.workspace.name).toBe("Admin Created Workspace");
    });

    it("should deny regular user access to admin endpoints", async () => {
      const response = await testServer
        .post("/admin/workspaces")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send({
          name: "Unauthorized Request",
          accountId: "target-account-id"
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("SuperAdmin access required");
    });
  });
});
```

## Development Setup Integration

### Admin User Setup for Development

The existing `dev-setup.ts` script creates development workspaces, but we need to ensure SuperAdmin accounts are available for testing admin functionality.

#### Update Seeds for Admin Testing:

```typescript
// src/services/db/seeds/accounts.ts - ensure SuperAdmin exists
const accountsArray: SeedAccountType[] = [
  {
    fullName: "Super Admin",
    phone: "555-555-5555",
    email: "admin@example.com",
    isSuperAdmin: true,
    password: "password123"
  },
  {
    fullName: "Regular User",
    phone: "555-555-5556",
    email: "user@example.com",
    isSuperAdmin: false,
    password: "password123"
  }
];
```

#### Add Admin Testing Script:

```typescript
// scripts/admin-setup.ts
import { db } from "@/services/db/drizzle.ts";
import { accounts } from "@/schema.ts";
import { eq } from "drizzle-orm";
import { logger } from "@/helpers/index.ts";

async function createAdminTestData() {
  const adminEmail = "admin@example.com";

  const [adminAccount] = await db.select().from(accounts).where(eq(accounts.email, adminEmail)).limit(1);

  if (!adminAccount) {
    logger.error(`Admin account ${adminEmail} not found. Run 'pnpm seed' first.`);
    process.exit(1);
  }

  if (!adminAccount.isSuperAdmin) {
    logger.error(`Account ${adminEmail} is not a SuperAdmin.`);
    process.exit(1);
  }

  logger.info(`✅ Admin account ready: ${adminEmail}`);
  logger.info(`Use this account to test /admin/* endpoints`);
}

createAdminTestData().catch(console.error);
```

### Environment Configuration

Add environment variables for enhanced security:

```bash
# .env.example additions
# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
ADMIN_RATE_LIMIT_MAX_REQUESTS=20

# Audit logging
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_LOG_ENABLED=true

# Swagger documentation
SWAGGER_ENABLED=true
SWAGGER_PATH=/docs
```

## Benefits of This Implementation

### Security Benefits

- **Proper Authentication**: All admin requests validated through JWT
- **Role-Based Access**: Clear separation between SuperAdmin and regular users
- **Audit Trail**: Complete history of admin actions with user context
- **Rate Limiting**: Protection against abuse and brute force attacks

### Operational Benefits

- **Complete API Coverage**: All CRUD operations for both permission levels
- **Self-Service Interface**: Web-based admin operations vs command line
- **Scalability**: Multiple admins can work simultaneously
- **Documentation**: Interactive API documentation with Swagger UI

### Development Benefits

- **Type Safety**: Leverages existing Zod schemas for validation and docs
- **Maintainability**: Consistent patterns across all endpoints
- **Testing**: Comprehensive test coverage for all permission scenarios
- **Integration**: Seamless with existing application architecture

## Next Steps

1. **Create new branch**: `feature/swagger-api-docs`
2. **Phase 1 Implementation**: Setup Swagger and security middleware
3. **Phase 2 Implementation**: Complete regular workspace endpoints
4. **Phase 3 Implementation**: Add `/admin` SuperAdmin routes
5. **Testing and Documentation**: Comprehensive testing and documentation updates
6. **Review and Deploy**: Security review and production deployment

This implementation provides a secure, scalable, and well-documented API that properly separates SuperAdmin operations from regular user operations while maintaining the existing architecture and patterns.
