# Admin Management Implementation Guide

## Overview

This document outlines the secure implementation of administrative functionality for account and workspace management. Instead of using CLI scripts that bypass authentication, we implement secure API endpoints that leverage the existing permission system.

## Security Principles

### Why Not CLI Scripts?

- **Bypass Authentication**: Scripts run with full database access, ignoring JWT validation
- **No Authorization**: Developers can perform admin actions without proper permissions
- **No Audit Trail**: No logging of who performed what actions
- **Production Risk**: Easy to accidentally run against production databases

### Secure Admin Endpoints Approach

- **Authenticated Access**: All requests validated through existing JWT system
- **Role-Based Authorization**: Only SuperAdmin accounts can access admin endpoints
- **Audit Logging**: All admin actions logged with user context
- **Request Validation**: Zod schemas ensure data integrity
- **Rate Limiting**: Prevent abuse and brute force attempts

## Implementation Plan

### 1. Admin Route Structure

```
/admin/
├── accounts/
│   ├── POST /                    # Create account
│   ├── PUT /:id/role            # Promote/demote admin status
│   ├── PUT /:id/status          # Activate/deactivate account
│   └── GET /                    # List accounts (paginated)
├── workspaces/
│   ├── POST /                   # Create workspace
│   ├── PUT /:id                 # Update workspace
│   ├── DELETE /:id              # Delete workspace
│   └── POST /:id/invite         # Invite user to workspace
└── memberships/
    ├── PUT /:id/role            # Change member role
    └── DELETE /:id              # Remove membership
```

### 2. Middleware Chain

```typescript
// Admin routes protected by:
app.use("/admin", [
  isAuthenticated, // Verify JWT token
  isAuthorized, // Check SuperAdmin permission
  auditLogger, // Log admin actions
  rateLimiter // Prevent abuse
]);
```

### 3. Required Files

```
src/
├── handlers/
│   └── admin/
│       ├── admin.handlers.ts     # Admin endpoint handlers
│       ├── admin.methods.ts      # Admin business logic
│       └── admin.schemas.ts      # Validation schemas
├── middleware/
│   ├── auditLogger.ts           # Admin action logging
│   └── rateLimiter.ts           # Rate limiting middleware
└── routes/
    └── admin.routes.ts          # Admin route definitions
```

## Implementation Details

### Account Management Endpoints

#### Create Account

- **Endpoint**: `POST /admin/accounts`
- **Permission**: SuperAdmin only
- **Functionality**: Create new account with optional Supabase sync
- **Validation**: Email format, required fields, duplicate check
- **Response**: Created account details (excluding sensitive data)

#### Promote/Demote Admin

- **Endpoint**: `PUT /admin/accounts/:id/role`
- **Permission**: SuperAdmin only
- **Functionality**: Toggle `isSuperAdmin` flag
- **Validation**: Account exists, not self-demotion
- **Audit**: Log role changes with timestamp and acting user

#### Account Status Management

- **Endpoint**: `PUT /admin/accounts/:id/status`
- **Permission**: SuperAdmin only
- **Functionality**: Activate/deactivate accounts
- **Business Logic**: Prevent self-deactivation, cascade to workspaces

### Workspace Management Endpoints

#### Create Workspace

- **Endpoint**: `POST /admin/workspaces`
- **Permission**: SuperAdmin only
- **Functionality**: Create workspace for any account
- **Validation**: Account exists, workspace name unique per account
- **Auto-Creation**: Profile and admin membership for account

#### Invite User to Workspace

- **Endpoint**: `POST /admin/workspaces/:id/invite`
- **Permission**: SuperAdmin only
- **Functionality**: Add user to workspace with specified role
- **Validation**: Workspace exists, user exists, not already member
- **Business Logic**: Create profile and membership records

### Audit Logging

#### Audit Log Schema

```typescript
interface AdminAuditLog {
  id: string;
  adminAccountId: string; // Who performed the action
  action: string; // What was done
  targetType: "account" | "workspace" | "membership";
  targetId: string; // What was affected
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}
```

#### Logged Actions

- Account creation, role changes, status changes
- Workspace creation, updates, deletion
- Membership role changes, additions, removals
- Failed authorization attempts

### Security Measures

#### Rate Limiting

- **Account Operations**: 10 requests per minute per IP
- **Workspace Operations**: 20 requests per minute per IP
- **Bulk Operations**: 5 requests per minute per IP

#### Request Validation

- **Zod Schemas**: Validate all request bodies
- **Parameter Validation**: Ensure UUIDs are valid format
- **Business Rules**: Enforce domain-specific constraints

#### Error Handling

- **Sensitive Data**: Never expose internal errors to clients
- **Audit Failed Attempts**: Log failed authorization attempts
- **Rate Limit Responses**: Return 429 with retry headers

## Frontend Integration

### Admin Dashboard Components

#### Account Management

- **Account List**: Paginated table with search/filter
- **Account Details**: View/edit account information
- **Role Management**: Toggle admin status with confirmation
- **Account Status**: Activate/deactivate with reason tracking

#### Workspace Management

- **Workspace List**: All workspaces across all accounts
- **Workspace Details**: Members, settings, activity
- **User Invitation**: Add users to workspaces with role selection
- **Membership Management**: Change roles, remove members

### API Integration Examples

```typescript
// Account creation
const createAccount = async (accountData: CreateAccountRequest) => {
  const response = await fetch("/admin/accounts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(accountData)
  });
  return response.json();
};

// Workspace invitation
const inviteToWorkspace = async (workspaceId: string, invitation: InviteRequest) => {
  const response = await fetch(`/admin/workspaces/${workspaceId}/invite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(invitation)
  });
  return response.json();
};
```

## Migration from CLI Scripts

### Phase 1: Implement Admin Endpoints

1. Create admin handlers and routes
2. Implement audit logging system
3. Add rate limiting middleware
4. Test endpoints with SuperAdmin account

### Phase 2: Build Admin UI

1. Create admin dashboard components
2. Implement account management interface
3. Add workspace management interface
4. Include audit log viewer

### Phase 3: Deprecate CLI Scripts

1. Update documentation to reference admin endpoints
2. Add warnings to existing CLI scripts
3. Remove CLI scripts from package.json
4. Keep only seeding scripts for development

## CLI Scripts to Keep

### Development/Testing Only

- **Seeding**: `pnpm seed` - Initial data for development
- **Database Reset**: `pnpm db:reset` - Clean slate for testing
- **Migration**: `pnpm migrate` - Schema changes

### Emergency Recovery Only

- **Data Recovery**: Manual scripts for production emergencies
- **Backup Restore**: Database restoration procedures
- **System Maintenance**: Scheduled maintenance tasks

## Benefits of This Approach

### Security

- **Proper Authentication**: All requests validated through JWT
- **Role-Based Access**: Only authorized users can perform admin actions
- **Audit Trail**: Complete history of admin actions
- **Network Security**: HTTPS encryption for all admin operations

### Operational

- **User Experience**: Intuitive web interface vs command line
- **Error Handling**: Proper error messages and validation
- **Scalability**: Multiple admins can work simultaneously
- **Integration**: Seamless with existing application architecture

### Compliance

- **Audit Requirements**: Complete logging of administrative actions
- **Access Control**: Documented permission system
- **Change Management**: Tracked and attributed modifications
- **Data Protection**: Secure handling of sensitive operations

## Next Steps

1. **Review and approve** this implementation plan
2. **Create admin endpoint handlers** following existing patterns
3. **Implement audit logging system** with proper database schema
4. **Build admin dashboard** with React/Vue components
5. **Test thoroughly** with different user roles and scenarios
6. **Document API endpoints** for frontend developers
7. **Deploy and monitor** admin functionality in production

This approach ensures that administrative functions are secure, auditable, and maintainable while leveraging your existing authentication and authorization infrastructure.
