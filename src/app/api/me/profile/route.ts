import { createClient } from "@/lib/supabase/server";
import { failure, json, mutationBody } from "@/lib/security/http";
import { profileSchema } from "@/lib/validation/auth";
import { copy } from "@/content/copy.en";

export async function PATCH(request: Request) {
  let body: unknown;
  try { body = await mutationBody(request); } catch { return failure(); }
  const input = profileSchema.safeParse(body);
  if (!input.success) return failure();
  const supabase = await createClient();
  if (!supabase) return failure("AUTH_UNAVAILABLE", 503, copy.auth.unavailable);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email_confirmed_at) return failure("AUTH_REQUIRED", 401);
  const { data, error } = await supabase.rpc("update_profile", { p_username: input.data.username, p_display_name: input.data.displayName, p_avatar_seed: input.data.avatarSeed });
  if (error?.code === "23505") return failure("USERNAME_TAKEN", 409, copy.profile.taken);
  if (error?.message === "PROFILE_LOCKED") return failure("PROFILE_LOCKED", 409, copy.profile.locked);
  if (error?.message === "RATE_LIMITED") { const response = failure("RATE_LIMITED", 429, copy.auth.rateLimit); response.headers.set("Retry-After", "60"); return response; }
  if (error) return failure("PROFILE_UNAVAILABLE", 503, copy.profile.unavailable);
  return json({ profile: data });
}
