import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/security/redirect";
import { markRecovery } from "@/lib/security/recovery";
import { siteOrigin } from "@/lib/env";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const next = safeRedirect(params.get("next"));
  const supabase = await createClient();
  if (code && code.length < 2048 && supabase) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const profile = await supabase.rpc("ensure_profile");
      if (profile.error) return NextResponse.redirect(new URL("/login?error=link", siteOrigin()));
      if (next === "/reset-password") await markRecovery(data.user.id);
      const response = NextResponse.redirect(new URL(next, siteOrigin()));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", siteOrigin()));
}
