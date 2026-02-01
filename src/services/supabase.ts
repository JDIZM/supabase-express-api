import { config } from "../config.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for auth operations (getClaims, signIn, signUp)
 * Uses publishable key - RLS applies but we only use auth endpoints
 */
export const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Supabase admin client for auth.admin.* operations
 * Uses secret key - bypasses RLS (for admin operations only)
 */
let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    if (!config.supabaseSecretKey) {
      throw new Error("SUPABASE_SECRET_KEY is required for admin client");
    }
    supabaseAdmin = createClient(config.supabaseUrl, config.supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdmin;
}
