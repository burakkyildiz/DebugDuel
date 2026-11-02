import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database.generated";

export function createPrivilegedClient() {
  const env = publicSupabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!env || !secret || secret.includes("placeholder")) return null;
  // Never share this instance with SSR cookies, sign-in, or user sessions.
  return createClient<Database>(env.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
