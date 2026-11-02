import "server-only";
import { publicSupabaseEnv } from "@/lib/env";

export async function githubProviderEnabled(): Promise<boolean> {
  const env = publicSupabaseEnv();
  if (!env) return false;
  try {
    const response = await fetch(`${env.url}/auth/v1/settings`, {
      headers: { apikey: env.key }, cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const settings = await response.json();
    return settings?.external?.github === true;
  } catch { return false; }
}
