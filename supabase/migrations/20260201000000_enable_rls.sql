-- Enable Row Level Security on all data tables
-- No policies = deny all direct access via publishable/anon key
-- API uses DATABASE_URL (Drizzle ORM), which bypasses RLS
--
-- This provides defense-in-depth: if publishable key leaks,
-- direct data queries return empty results.
-- Auth endpoints (/auth/v1/*) are unaffected by RLS.

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
