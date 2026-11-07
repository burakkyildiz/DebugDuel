import { createClient } from "@/lib/supabase/server";
import { engineHealthSchema } from "@/features/matches/contracts";
import { failure, json } from "@/lib/security/http";
import { admitPublicRead, PublicReadLimited } from "@/lib/security/public-read";
import { copy } from "@/content/copy.en";
import { observed } from "@/lib/security/telemetry";
export async function GET(request: Request) {
  return observed("health", () => health(request));
}
async function health(request: Request) {
  try {
    await admitPublicRead(request.headers, "health");
    const client = await createClient();
    const response = await client?.rpc("engine_status");
    const health = engineHealthSchema.safeParse(response?.data);
    if (!response?.error && health.success) return json(health.data, health.data.ready ? 200 : 503);
  } catch (error) {
    if (error instanceof PublicReadLimited) {
      const response = failure("RATE_LIMITED", 429, copy.auth.rateLimit);
      response.headers.set("Retry-After", "60");
      return response;
    }
    // A dependency failure is unhealthy, never a fabricated tick.
  }
  return json({ ready: false, lastSuccessfulTickAt: null }, 503);
}
