import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/security/redirect";

export const currentUser = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
});

export async function requireUser(next = "/profile") {
  const user = await currentUser();
  if (!user || !user.email_confirmed_at) redirect(`/login?next=${encodeURIComponent(safeRedirect(next))}`);
  return user;
}
