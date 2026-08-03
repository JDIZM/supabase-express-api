# GitHub Actions Database Migrations Guide

> **Status (2026-08-03): partly implemented.** This began as a proposal and
> parts of it have since shipped, so read it as design notes plus a
> backlog, not as a description of the pipeline.
>
> **What exists today:** a `verify-migrations` job in both `main.yml` and
> `pull-request.yml`. It spins up a throwaway `postgres:17-alpine` service
> container and applies every migration to it. That is *verification* — it
> catches a broken or conflicting migration before anything real is touched
> — and it needs no secrets, so it works on forks too.
>
> **What does NOT exist:** any job that applies migrations to a real
> database. The `migrate-dev` job described below is present in `main.yml`
> but **commented out**, along with the conditions for re-enabling it. No
> deployment step runs migrations against dev, staging or production; that
> is still manual.
>
> The section below described the repo before any of this landed; it is
> kept for the reasoning, with the stale facts corrected inline.

## Overview

Database migrations against real environments are still run manually with
`pnpm migrate`. This guide outlines how that could be automated so schema
changes are applied consistently across dev/staging/production.

## Current State Analysis

### Existing GitHub Actions Workflows

The project has three workflows configured:

1. **`pull-request.yml`** - tests on PRs (Node 22, 24 matrix) + `verify-migrations`
2. **`main.yml`** - tests on main pushes + `verify-migrations`, plus a commented-out `migrate-dev`
3. **`release.yml`** - tests on releases + commented deployment to prod

### Current Database Setup

- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Database**: PostgreSQL (Supabase or self-hosted)
- **Migration Commands**:
  - `pnpm migrate` - Apply pending migrations
  - `pnpm migrate:create` - Generate new migration files
  - `pnpm migrate:push` - Push schema changes (dev only)

### Environment Configuration

Database configuration is handled via environment variables in `src/config.ts`:

```typescript
export const config = {
  db_host: process.env.POSTGRES_HOST || "localhost",
  db_port: Number(process.env.POSTGRES_PORT) || 5432,
  db_user: process.env.POSTGRES_USER || "postgres",
  db_password: process.env.POSTGRES_PASSWORD || "postgres",
  db_name: process.env.POSTGRES_DB || "postgres"
  // SSL enabled for non-development environments
};
```

## Implementation Strategy

### 1. GitHub Repository Secrets Setup

Configure environment-specific database credentials as GitHub secrets:

#### Development Environment

- `DEV_POSTGRES_HOST` - Development database host
- `DEV_POSTGRES_PORT` - Development database port (default: 5432)
- `DEV_POSTGRES_USER` - Development database user
- `DEV_POSTGRES_PASSWORD` - Development database password
- `DEV_POSTGRES_DB` - Development database name

#### Production Environment

- `PROD_POSTGRES_HOST` - Production database host
- `PROD_POSTGRES_PORT` - Production database port
- `PROD_POSTGRES_USER` - Production database user
- `PROD_POSTGRES_PASSWORD` - Production database password
- `PROD_POSTGRES_DB` - Production database name

#### Additional Secrets (if needed)

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_PK` - Supabase public key
- `SUPABASE_AUTH_JWT_SECRET` - JWT secret for authentication

### 2. Create Migration Workflow

Create `.github/workflows/migrate.yml`:

```yaml
name: Database Migrations

on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Environment to migrate"
        required: true
        default: "dev"
        type: choice
        options:
          - dev
          - prod
      dry_run:
        description: "Run in dry-run mode"
        required: false
        default: false
        type: boolean

jobs:
  migrate-dev:
    if: ${{ github.event.inputs.environment == 'dev' }}
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: actions/checkout@v4

      - uses: volta-cli/action@v4
        with:
          node-version: 22

      - name: Install dependencies  
        run: |
          corepack enable pnpm
          pnpm install

      - name: Run Database Migrations (Dev)
        env:
          NODE_ENV: production
          POSTGRES_HOST: ${{ secrets.DEV_POSTGRES_HOST }}
          POSTGRES_PORT: ${{ secrets.DEV_POSTGRES_PORT }}
          POSTGRES_USER: ${{ secrets.DEV_POSTGRES_USER }}
          POSTGRES_PASSWORD: ${{ secrets.DEV_POSTGRES_PASSWORD }}
          POSTGRES_DB: ${{ secrets.DEV_POSTGRES_DB }}
        run: |
          if [[ "${{ github.event.inputs.dry_run }}" == "true" ]]; then
            echo "Dry run mode - would run: npx drizzle-kit migrate"
            npx drizzle-kit up --verbose
          else
            echo "Running migrations..."
            npx drizzle-kit migrate
          fi

  migrate-prod:
    if: ${{ github.event.inputs.environment == 'prod' }}
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: volta-cli/action@v4
        with:
          node-version: 22

      - name: Install dependencies  
        run: |
          corepack enable pnpm
          pnpm install

      - name: Run Database Migrations (Prod)
        env:
          NODE_ENV: production
          POSTGRES_HOST: ${{ secrets.PROD_POSTGRES_HOST }}
          POSTGRES_PORT: ${{ secrets.PROD_POSTGRES_PORT }}
          POSTGRES_USER: ${{ secrets.PROD_POSTGRES_USER }}
          POSTGRES_PASSWORD: ${{ secrets.PROD_POSTGRES_PASSWORD }}
          POSTGRES_DB: ${{ secrets.PROD_POSTGRES_DB }}
        run: |
          if [[ "${{ github.event.inputs.dry_run }}" == "true" ]]; then
            echo "Dry run mode - would run: npx drizzle-kit migrate"
            npx drizzle-kit up --verbose
          else
            echo "Running migrations..."
            npx drizzle-kit migrate
          fi
```

### 3. Enhanced Deployment Workflows

Update existing deployment workflows to include migration steps:

#### For `main.yml` (Development Deployment)

```yaml
deploy-dev:
  needs: test-and-build
  runs-on: ubuntu-latest
  environment: development
  steps:
    - uses: actions/checkout@v4
    - uses: volta-cli/action@v4
      with:
        node-version: 22

    # Run migrations before deployment
    - name: Install dependencies for migrations
      run: |
        corepack enable pnpm
        pnpm install

    - name: Run Database Migrations
      env:
        NODE_ENV: production
        POSTGRES_HOST: ${{ secrets.DEV_POSTGRES_HOST }}
        POSTGRES_USER: ${{ secrets.DEV_POSTGRES_USER }}
        POSTGRES_PASSWORD: ${{ secrets.DEV_POSTGRES_PASSWORD }}
        POSTGRES_DB: ${{ secrets.DEV_POSTGRES_DB }}
      run: npx drizzle-kit migrate

    # Continue with existing deployment steps...
    - name: Install doctl
      uses: digitalocean/action-doctl@v2
      with:
        token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
    # ... rest of deployment
```

#### For `release.yml` (Production Deployment)

```yaml
deploy-prod:
  needs: test-and-build
  runs-on: ubuntu-latest
  environment: production
  steps:
    - uses: actions/checkout@v4
    - uses: volta-cli/action@v4
      with:
        node-version: 22

    # Run migrations before deployment
    - name: Install dependencies for migrations
      run: |
        corepack enable pnpm
        pnpm install

    - name: Run Database Migrations
      env:
        NODE_ENV: production
        POSTGRES_HOST: ${{ secrets.PROD_POSTGRES_HOST }}
        POSTGRES_USER: ${{ secrets.PROD_POSTGRES_USER }}
        POSTGRES_PASSWORD: ${{ secrets.PROD_POSTGRES_PASSWORD }}
        POSTGRES_DB: ${{ secrets.PROD_POSTGRES_DB }}
      run: npx drizzle-kit migrate

    # Continue with existing deployment steps...
    - name: Install doctl
      uses: digitalocean/action-doctl@v2
      with:
        token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
    # ... rest of deployment
```

## Safety Mechanisms

### 1. Migration Validation Script

Create `scripts/validate-migration.ts`:

```typescript
/**
 * Validates pending migrations before applying them
 * Checks for potentially destructive operations
 */
import { logger } from "@/helpers/index.ts";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

async function validateMigrations(): Promise<boolean> {
  try {
    const migrationsDir = "./drizzle";
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith(".sql"));

    // Check for destructive operations
    const destructiveKeywords = ["DROP TABLE", "DROP COLUMN", "ALTER TABLE.*DROP", "TRUNCATE", "DELETE FROM"];

    for (const file of sqlFiles) {
      const content = await readFile(join(migrationsDir, file), "utf-8");

      for (const keyword of destructiveKeywords) {
        const regex = new RegExp(keyword, "i");
        if (regex.test(content)) {
          logger.warn(`⚠️  Potentially destructive operation found in ${file}: ${keyword}`);
          logger.warn(`Review this migration carefully before proceeding.`);
        }
      }
    }

    logger.info(`✓ Validated ${sqlFiles.length} migration files`);
    return true;
  } catch (error) {
    logger.error({ msg: "Migration validation failed", error });
    return false;
  }
}

// Run validation
try {
  const isValid = await validateMigrations();
  process.exit(isValid ? 0 : 1);
} catch (error) {
  logger.error({ msg: "Validation script failed", error });
  process.exit(1);
}
```

Add to workflows:

```yaml
- name: Validate Migrations
  run: pnpm run validate-migrations || true # Warning only
```

### 2. Database Backup Considerations

For production migrations, consider adding backup steps:

```yaml
- name: Create Database Backup (if supported)
  env:
    POSTGRES_HOST: ${{ secrets.PROD_POSTGRES_HOST }}
    POSTGRES_USER: ${{ secrets.PROD_POSTGRES_USER }}
    POSTGRES_PASSWORD: ${{ secrets.PROD_POSTGRES_PASSWORD }}
    POSTGRES_DB: ${{ secrets.PROD_POSTGRES_DB }}
  run: |
    # This depends on your database provider
    # For Supabase, use their backup APIs
    # For self-hosted, use pg_dump
    echo "Creating backup before migration..."
    # pg_dump commands here if applicable
```

### 3. Migration Status Notifications

Add notification steps:

```yaml
- name: Notify Migration Success
  if: success()
  run: |
    echo "✅ Database migrations completed successfully for ${{ github.event.inputs.environment }}"
    # Add Slack/Discord/email notifications here

- name: Notify Migration Failure
  if: failure()
  run: |
    echo "❌ Database migrations failed for ${{ github.event.inputs.environment }}"
    # Add alerting here
```

## Testing Strategy

### 1. Development Environment Testing

1. **Manual Migration Testing**:

   ```bash
   # Test locally first
   pnpm migrate
   ```

2. **GitHub Actions Testing**:
   - Use the manual workflow dispatch with `dry_run: true`
   - Test with development environment first
   - Verify migration output and logs

### 2. Production Readiness Checklist

Before running production migrations:

- [ ] Test migration on development environment
- [ ] Verify all environment variables are set correctly
- [ ] Review migration SQL for destructive operations
- [ ] Ensure database backups are available
- [ ] Plan rollback strategy if needed
- [ ] Schedule maintenance window if required

## Environment-Specific Considerations

### Supabase Environments

If using Supabase for different environments:

```yaml
env:
  NODE_ENV: production
  POSTGRES_HOST: ${{ secrets.SUPABASE_DB_HOST }} # e.g., db.abc123.supabase.co
  POSTGRES_PORT: 5432
  POSTGRES_USER: postgres.abc123
  POSTGRES_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
  POSTGRES_DB: postgres
  # SSL is automatically enabled for non-development
```

### Self-Hosted PostgreSQL

For self-hosted databases, ensure:

- SSL certificates are properly configured
- Network access is allowed from GitHub Actions IPs
- Connection pooling settings are appropriate

## Rollback Procedures

### 1. Automated Rollback (Limited)

Drizzle doesn't provide automatic rollback, but you can:

```typescript
// Create rollback migrations manually
// Example: if migration adds column, create migration to drop column
```

### 2. Manual Rollback Process

1. **Identify Problem**: Monitor application after migration
2. **Create Rollback Migration**: Write reverse migration manually
3. **Apply Rollback**: Use same GitHub Actions workflow
4. **Verify**: Test application functionality

### 3. Database Restore (Last Resort)

If rollback migrations aren't possible:

- Restore from backup (if available)
- Replay transactions since backup
- Update application deployment to previous version

## Integration with Existing Workflows

### Current Deployment Flow

1. **PR** → `pull-request.yml` (tests only)
2. **Merge to main** → `main.yml` (test + deploy dev)
3. **Release** → `release.yml` (test + deploy prod)

### Enhanced Flow with Migrations

1. **PR** → `pull-request.yml` (tests only)
2. **Merge to main** → `main.yml` (test + **migrate dev** + deploy dev)
3. **Release** → `release.yml` (test + **migrate prod** + deploy prod)

### Manual Migration Flow

- **Anytime** → `migrate.yml` (manual trigger for specific environments)

## Script Additions to package.json

Add these scripts for CI/CD:

```json
{
  "scripts": {
    "migrate:ci": "NODE_ENV=production npx drizzle-kit migrate",
    "validate-migrations": "tsx scripts/validate-migration.ts"
  }
}
```

## Security Considerations

### 1. Secret Management

- Use GitHub environments for secret isolation
- Rotate database credentials regularly
- Use principle of least privilege for database users
- Consider using short-lived credentials where possible

### 2. Network Security

- Restrict database access to known IP ranges
- Use SSL/TLS for all database connections
- Monitor connection attempts and failed authentications

### 3. Audit Trail

- Log all migration activities
- Track who initiated migrations and when
- Store migration logs for compliance/debugging

## Monitoring and Alerting

### 1. Migration Monitoring

- Track migration execution time
- Monitor for failed migrations
- Alert on long-running migrations

### 2. Database Health Checks

After migrations:

- Verify application can connect
- Run basic health checks
- Monitor error rates and performance

## Implementation Steps

### Phase 1: Setup (Low Risk)

1. Add GitHub repository secrets
2. Create validation script
3. Create manual migration workflow
4. Test with development environment

### Phase 2: Integration (Medium Risk)

1. Update main.yml to include dev migrations
2. Test automated dev deployments
3. Monitor and refine process

### Phase 3: Production (High Risk)

1. Update release.yml to include prod migrations
2. Plan first production migration carefully
3. Execute during maintenance window
4. Monitor post-migration

## Conclusion

This setup provides automated, safe database migrations integrated with your existing CI/CD pipeline. The manual workflow allows for controlled migration execution, while the automated integration ensures consistency across environments.

Key benefits:

- **Consistency**: Same migration process across all environments
- **Safety**: Validation, dry-run mode, and monitoring
- **Automation**: Reduces manual deployment steps
- **Traceability**: Full audit trail of schema changes

Start with the manual workflow and development environment to build confidence before enabling production automation.
