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

When running the migrations for the first time on a new database run:

```bash
pnpm run migrate
```

When the schema/model is changed make sure to create a new migration and run it against the db.

### 1. Create a new migration

```bash
pnpm run migrate:create

```

### 2. Run the migrations

```bash
# first run the migrations
pnpm run migrate:up

# then run
pnpm migrate:push
```

### Seeds

You can run the seeds to populate the database with initial data.

Before seeding the db make sure to run the migrations. If you want to populate the seeds with specific user email, password or id's related to the users created in Supabase. You can update the seeds in `./src/seeds/` with the required data.

You will need to add these users to supabase auth and confirm the email addresses.

<!-- and make sure to pass the `--supabase=true` flag to the seed command and it will create the users in Supabase and associate the id's with the db records.

Note: If you are creating users with Supabase you will need to confirm the email addresses.-->

```bash
pnpm run seed
```

#### Development Workspace Setup

After seeding the database, you can create development workspaces for testing:

```bash
# Create a single workspace
pnpm dev:workspace --email=user@example.com --name="Test Workspace"

# Create a workspace with specific profile name and role
pnpm dev:workspace --email=user@example.com --name="Client Project" --profile="John" --role=user

# Create multiple test workspaces
pnpm dev:workspaces --email=user@example.com
```

**Note**: The account email must exist in the database (created during seeding) before creating workspaces.

#### JWT Token Testing

Test and generate JWT tokens for API development and debugging:

```bash
# Generate a test token for development
pnpm token-test --generate --account-id=965df6bf-ab16-4fc0-a6b1-3da31d48f832 --email=user1@example.com

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

### Workspace route permission levels

Ensure every request that requires workspace permissions includes a workspace context.

This can be done by passing the `x-workspace-id` header when making a request.

This will allow the user to access the workspace resources if they are a member of the workspace with a sufficient role.

A role/claim is defined when the account is added to the workspace as a member.

1. User - Can access all resources with user permissions.
2. Admin - Can access all resources within the workspace.

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
