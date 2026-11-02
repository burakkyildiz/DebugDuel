import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markRecovery } from "@/lib/security/recovery";
import { siteOrigin } from "@/lib/env";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token_hash");
  const type = params.get("type");
  const supabase = await createClient();
  if (token && token.length <= 256 && (type === "signup" || type === "email" || type === "recovery") && supabase) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: token, type });
    if (!error && data.user) {
      const profile = await supabase.rpc("ensure_profile");
      if (profile.error) return NextResponse.redirect(new URL("/login?error=link", siteOrigin()));
      if (type === "recovery") await markRecovery(data.user.id);
      const response = NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : "/onboarding", siteOrigin()));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", siteOrigin()));
}
