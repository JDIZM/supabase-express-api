CREATE TABLE IF NOT EXISTS "accounts" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"phone" varchar(256),
	"created_at" timestamp (6) with time zone DEFAULT now(),
	"email" text NOT NULL,
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now(),
	"workspace_id" uuid NOT NULL,
	"account_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_memberships" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp (6) with time zone DEFAULT now(),
	"account_id" uuid NOT NULL
);
