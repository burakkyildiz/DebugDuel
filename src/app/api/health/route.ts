import { createClient } from "@/lib/supabase/server";
import { engineHealthSchema } from "@/features/matches/contracts";
import { json } from "@/lib/security/http";
export async function GET() {
  try {
    const client = await createClient();
    const response = await client?.rpc("engine_status");
    const health = engineHealthSchema.safeParse(response?.data);
    if (!response?.error && health.success) return json(health.data, health.data.ready ? 200 : 503);
  } catch { /* A dependency failure is unhealthy, never a fabricated tick. */ }
  return json({ ready: false, lastSuccessfulTickAt: null }, 503);
}
