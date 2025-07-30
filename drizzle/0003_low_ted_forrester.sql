CREATE INDEX "profiles_account_id_idx" ON "profiles" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "profiles_workspace_id_idx" ON "profiles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "profiles_workspace_account_idx" ON "profiles" USING btree ("workspace_id","account_id");--> statement-breakpoint
CREATE INDEX "memberships_account_id_idx" ON "workspace_memberships" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "memberships_workspace_id_idx" ON "workspace_memberships" USING btree ("workspace_id");