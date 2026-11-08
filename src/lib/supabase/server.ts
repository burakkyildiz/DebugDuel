import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { publicSupabaseEnv } from "@/lib/env";
import { authForwardingEnabled, authForwardingFetch } from "@/lib/supabase/auth-forwarding";
import type { Database } from "@/types/database.generated";

export async function createClient() {
  const env = publicSupabaseEnv();
  if (!env) return null;
  const store = await cookies();
  return createServerClient<Database>(env.url, env.key, {
    global: { fetch: authForwardingFetch(env, authForwardingEnabled() ? await headers() : new Headers()) },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Server Components cannot write cookies; proxy refreshes the session. */ }
      },
    },
  });
}
