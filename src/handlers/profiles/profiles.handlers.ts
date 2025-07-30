/**
 * Profile handlers have been removed from direct API access.
 *
 * Profiles are now accessed through workspace context:
 * - GET /me - User's profiles across all workspaces
 * - GET /workspaces/:id - Workspace with all member profiles
 * - GET /workspaces/:id/members - Dedicated member listing
 * - PATCH /workspaces/:id/profile - Update user's own profile in workspace
 *
 * This file is maintained only for the profile methods used by other handlers.
 * See profiles.methods.ts for the actual profile database operations.
 */
