# Supabase Express API

A production-ready Node.js/Express API template with TypeScript, authentication, and multi-tenant workspace system.

## Overview

This template provides a robust foundation for building scalable APIs with:

- **Authentication** - JWT-based auth with Supabase integration
- **Multi-tenancy** - Workspace-based system with role-based permissions
- **Database** - PostgreSQL with Drizzle ORM and migrations
- **Security** - Helmet, CORS, input validation, and error handling
- **Developer Experience** - ESM support, hot reload, testing, and Docker

## Features

### Core Features

- 🔐 **Authentication & Authorization** - JWT bearer tokens with Supabase
- 🏢 **Workspace Management** - Multi-tenant workspace system
- 👥 **User Management** - Account creation, profiles, and memberships
- 🛡️ **Role-based Permissions** - SuperAdmin, Admin, User, and Owner roles
- 📊 **Database Management** - Migrations, seeding, and Drizzle ORM
- ⚡ **Real-time Development** - Hot reload with tsx and pkgroll

### API Endpoints

- `/auth` - Authentication (login, signup)
- `/accounts` - User account management
- `/workspaces` - Workspace CRUD operations
- `/profiles` - User profiles within workspaces
- `/memberships` - Workspace membership management

### Tech Stack

- **Runtime**: Node.js 22+ with ESM modules
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Supabase](https://supabase.io/) with JWT
- **Validation**: [Zod](https://zod.dev/) schemas
- **Testing**: [Vitest](https://vitest.dev/) with coverage
- **Tooling**: ESLint, Prettier, tsx, pkgroll
- **Monitoring**: Sentry integration
- **Security**: Helmet, CORS, input sanitization

## Quick Start

### Prerequisites

- **Node.js 22+** - This project uses [Volta](https://volta.sh/) for Node version management
- **PostgreSQL** - Either local, cloud, or Supabase
- **Supabase Account** - For authentication (free tier available)

### Installation

1. **Install Node.js with Volta**:

   ```bash
   curl https://get.volta.sh | bash
   ```

2. **Install pnpm**:

   ```bash
   npm install --global corepack@latest
   corepack enable pnpm
   ```

3. **Clone and setup**:

   ```bash
   git clone <repository-url>
   cd supabase-express-api
   cp .env.example .env
   pnpm install
   ```

4. **Configure environment** (edit `.env`):

   ```bash
   # Database
   POSTGRES_HOST=localhost
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your-password
   POSTGRES_DB=your-database

   # Supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_PK=your-public-key
   ```

5. **Initialize database**:

   ```bash
   pnpm run migrate
   pnpm run seed
   ```

6. **Start development server**:
   ```bash
   pnpm dev
   ```

## Architecture

### ESM Support

This project uses **ESM (ECMAScript Modules)** for modern JavaScript imports:

- Development: [tsx](https://github.com/esbuild-kit/tsx) for hot reloading
- Production: [pkgroll](https://github.com/privatenumber/pkgroll) for bundling
- Import aliases: `@/` maps to `src/` directory

### Database Schema

Multi-tenant workspace system with:

- **accounts** - User accounts with super admin support
- **workspaces** - Tenant containers owned by accounts
- **profiles** - User presence within workspaces
- **workspace_memberships** - Role-based access control

## Development

### Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm test` - Run tests with coverage
- `pnpm lint` - Lint code with ESLint
- `pnpm format` - Format code with Prettier
- `pnpm tsc:check` - Type check without compilation

### Testing

Uses [Vitest](https://vitest.dev/) for unit testing. Install the [Vitest VS Code extension](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer) for the best experience.

### Debugging

This project includes VS Code debugging configurations for TypeScript development.

#### Quick Start Debugging

1. **Set breakpoints** in your TypeScript files
2. **Open Debug panel** (Cmd+Shift+D)
3. **Select "Debug API with tsx"** from the dropdown
4. **Press F5** to start debugging

#### Debugging Methods

##### Method 1: Direct TypeScript Debugging (Recommended)

Uses tsx to run TypeScript directly without building:

```bash
# VS Code will run this automatically when you press F5
pnpm tsx src/server.ts
```

##### Method 2: Attach to Running Process

For debugging an already running server:

```bash
# Terminal 1: Start server with inspect flag
pnpm tsx --inspect src/server.ts

# Terminal 2: Or use the provided task
# Cmd+Shift+P -> "Tasks: Run Task" -> "pnpm: dev with debugging"
```

Then in VS Code:

1. Select **"Attach to Running Server"** from debug dropdown
2. Press F5 to attach
3. Debugger connects to port 9229

##### Method 3: Command Line Debugging

For debugging without VS Code:

```bash
# Start with Node.js inspector
node --inspect-brk ./node_modules/.bin/tsx src/server.ts

# Chrome DevTools debugging
# 1. Open chrome://inspect
# 2. Click "Open dedicated DevTools for Node"
# 3. Server will pause at first line
```

#### Debugging Features

- **Breakpoints**: Click left of line numbers in VS Code
- **Conditional Breakpoints**: Right-click breakpoint -> "Edit Breakpoint"
- **Logpoints**: Right-click line -> "Add Logpoint" (logs without stopping)
- **Debug Console**: Evaluate expressions while paused
- **Call Stack**: See function call hierarchy
- **Variables**: Inspect local and closure variables

#### Debugging Tips

1. **Profile Name Issue**: Set breakpoints at:

   - `workspaces.handlers.ts:17` - Check if profileName is extracted
   - `workspaces.handlers.ts:39` - See profile creation

2. **Request Debugging**:

   ```typescript
   // Add logpoint or breakpoint here
   console.log("Request body:", req.body);
   console.log("Headers:", req.headers);
   ```

3. **Database Queries**:

   ```typescript
   // Enable query logging
   const result = await db.select().from(accounts);
   console.log("SQL:", result.toSQL()); // If using query builder
   ```

4. **Hot Reload**: Keep debugger attached while making changes - tsx will restart automatically

#### VS Code Debug Configurations

Located in `.vscode/launch.json`:

- **Debug API with tsx**: Direct TypeScript debugging
- **Attach to Running Server**: Attach to existing process on port 9229

Tasks in `.vscode/tasks.json`:

- **pnpm: dev with debugging**: Start server with inspect flag
- **pnpm: build/test/lint**: Other development tasks

## Database Setup

### Database Management

- **View Database**: `pnpm run studio` - Opens Drizzle Kit studio
- **Migrations**: `pnpm run migrate` - Apply pending migrations
- **Seeding**: `pnpm run seed` - Populate with sample data

### Local Development Options

#### Option 1: Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install supabase --save-dev

# Start local Supabase
supabase start

# Use connection string in .env
# postgresql://postgres:postgres@localhost:54322/postgres
```

Access dashboard at http://localhost:54323

#### Option 2: Docker PostgreSQL

```bash
# Simple setup
docker compose up -d

# Or with custom network
docker network create mynetwork
docker run --network mynetwork --name postgres \
  -e POSTGRES_PASSWORD=example \
  -p 5432:5432 -d postgres:15
```

### Migrations

#### Initial Setup

When running migrations for the first time on a new database:

```bash
pnpm run migrate
```

#### Schema Changes

When you modify the schema/models in `src/schema.ts`:

**1. Generate a new migration:**

```bash
pnpm run migrate:create
```

**2. Apply the migration:**

```bash
pnpm run migrate
```

#### Development Workflow

For rapid development, you can push schema changes directly (skips migration files):

```bash
pnpm run migrate:push
```

**⚠️ Warning:** `migrate:push` is for development only - it can cause data loss in production.

### Seeds

The seed script creates a comprehensive multi-tenant test environment with realistic business scenarios.

#### Seed Options

```bash
# Create local accounts only (recommended for development)
pnpm run seed

# Create both local accounts AND Supabase auth users
pnpm run seed --supabase=true
```

#### Test Data Created

**8 Test Accounts:**

- `admin@example.com` - Super Admin (can access admin endpoints)
- `alice@acmecorp.com` - ACME Corp owner with 2 workspaces
- `bob@techstartup.com` - TechStartup owner with 2 workspaces
- `carol@designstudio.com` - Design Studio owner
- `david@acmecorp.com` - ACME employee (user role)
- `emma@techstartup.com` - TechStartup employee (admin/user roles)
- `frank@suspended.com` - Suspended account (testing)
- `grace@inactive.com` - Inactive account (testing)

**5 Realistic Workspaces:**

- "ACME Corp - Main" - Primary business workspace
- "ACME Corp - R&D" - Research & development
- "TechStartup - Development" - Software development
- "TechStartup - Marketing" - Marketing campaigns
- "Design Studio Pro" - Creative workspace

**Multi-tenant Scenarios:**

- Cross-workspace memberships (Alice, Bob, Emma in multiple workspaces)
- Different roles within organizations (admin/user)
- Cross-company collaboration (Emma consulting for ACME)
- Account status variations (active/suspended/inactive)

#### Supabase Integration

For **database/API testing**: Use default `pnpm run seed` (local accounts only)

For **authentication testing**: Use `pnpm run seed --supabase=true` and either:

- Disable email confirmation in Supabase Auth settings, OR
- Manually confirm users in Supabase dashboard after seeding
- Replace test emails with working emails in `src/services/db/seeds/accounts.ts`

#### Development Workspace Setup

After seeding the database, you can create development workspaces for testing:

```bash
# Create a single workspace
pnpm dev:workspace --email=alice@acmecorp.com --name="Test Workspace"

# Create a workspace with specific profile name and role
pnpm dev:workspace --email=david@acmecorp.com --name="Client Project" --profile="David Chen" --role=user

# Create multiple test workspaces
pnpm dev:workspaces --email=bob@techstartup.com
```

**Note**: The account email must exist in the database (created during seeding) before creating workspaces.

#### JWT Token Testing

Test and generate JWT tokens for API development and debugging:

```bash
# Generate a test token for development (use actual account ID from seeded data)
pnpm token-test --generate --account-id=<account-uuid> --email=alice@acmecorp.com

# Verify a token with full payload information
pnpm token-test --token=<jwt-token> --show-payload --check-expiry

# Test if your JWT secret works with a token
pnpm token-test --token=<jwt-token> --test-secret

# Decode token without verification (debugging)
pnpm token-test --token=<jwt-token> --decode-only
```

**Note**: Use actual account IDs from your seeded database when generating tokens.

Be sure to update the seeds as new migrations are added.

## Build with docker

```bash
# build the app
npm run build

# build with docker
docker build . --tag node-express

# or to build with a specific platform
docker build . --tag node-express --platform linux/amd64

# or build a specific stage eg dev
docker build . --target dev --tag node-express

# start the docker container
docker run -d -p 4000:4000 node-express

# view it running on localhost
curl localhost:4000
```

## Import aliases

Aliases can be configured in the import map, defined in package.json#imports.

see: https://github.com/privatenumber/pkgroll#aliases

## Authentication

This project uses JWT bearer token for authentication. The claims, id and sub must be set on the token and the token can be verified and decoded using the configured auth provider.

## Permissions

How permissions work.

A resource will have a permission level for each route method based on users role within the workspace. Workspace permissions can be defined in `./src/helpers/permissions.ts`.

Workspace level permissions:
Admin: Highest level of access to all resources within the workspace.
User: Regular user with limited permissions.

Resource level permissions:
Owner: Has access to their own resources

Account level permissions:
SuperAdmin: Has access to all super only resources.

### Workspace Authorization Pattern

This API uses a consistent header-based authorization pattern for all workspace-scoped operations.

#### The `x-workspace-id` Header

All requests that operate within a workspace context **must** include the `x-workspace-id` header, even if the workspace ID is already present in the URL path.

**Why use headers instead of just URL parameters?**

- **Consistency**: Single authorization pattern across all endpoints
- **Flexibility**: Supports future endpoints that don't naturally include workspace ID in the URL
- **Security**: Explicit workspace context prevents accidental cross-workspace access
- **Scalability**: Easy to add additional context headers in the future (e.g., `x-project-id`)

**Example:**

```bash
# Even though the workspace ID is in the URL, the header is still required
curl -X GET http://localhost:4000/workspaces/123e4567-e89b-12d3-a456-426614174000/members \
  -H "Authorization: Bearer your-jwt-token" \
  -H "x-workspace-id: 123e4567-e89b-12d3-a456-426614174000"
```

The authorization middleware will:

1. Verify the user is authenticated (via JWT)
2. Check the user is a member of the specified workspace (via header)
3. Validate the user has the required role (User/Admin) for the operation

A role/claim is defined when the account is added to the workspace as a member.

1. User - Can access all resources with user permissions.
2. Admin - Can access all resources within the workspace.

### API Endpoints

#### Profile Data Access

Profile endpoints (`/profiles` and `/profiles/:id`) have been removed to enforce proper workspace-scoped security. Profile data is now accessible only through workspace context:

- **`GET /me`** - Returns the current user's account and all their profiles across workspaces
- **`GET /workspaces/:id`** - Returns workspace details including all members with their profiles
- **`GET /workspaces/:id/members`** - Returns all workspace members with profile information

This ensures profile data is always accessed with proper workspace authorization.

## Supabase Auth

see the [documentation for more information](https://supabase.com/docs/reference/javascript/auth-api) on how to use Supabase Auth with this project.

## Deployment with DigitalOcean

A docker image can be built and deployed to a [container registry](https://docs.digitalocean.com/products/container-registry/getting-started/quickstart/). We can configure DigitalOcean to deploy the image once the registry updates using their [App Platform](https://docs.digitalocean.com/products/app-platform/)

The following secrets will need to be added to Github Actions for a successful deployment to DigitalOcean.

### Environment variables for deployment

- `DIGITALOCEAN_ACCESS_TOKEN` https://docs.digitalocean.com/reference/api/create-personal-access-token/
- `REGISTRY_NAME` eg registry.digitalocean.com/my-container-registry
- `IMAGE_NAME` the name of the image we are pushing to the repository eg `express-api` it will be tagged with the latest version and a github sha.

### App level environment variables

For information on confguring the app level environment variables see [How to use environment variables in DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/)

- `NODE_ENV`: `production`
- `APP_URL`: `https://api.example.com`
- `POSTGRES_HOST`: `<region>.pooler.supabase.com`
- `POSTGRES_USER`: `postgres.<supabase-id>`
- `POSTGRES_PASSWORD`: `example`
- `POSTGRES_DB`: `postgres`
- `SUPABASE_URL`: `https://<supabase-id>.supabase.co`
- `SUPABASE_PK`: `abcdefghijklm`
