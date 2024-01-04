CREATE TABLE IF NOT EXISTS "users" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text,
	"phone" varchar(256),
	"created_at" timestamp (6) with time zone DEFAULT now(),
	"email" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
