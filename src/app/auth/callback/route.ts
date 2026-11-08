import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/security/redirect";
import { markRecovery } from "@/lib/security/recovery";
import { siteOrigin } from "@/lib/env";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const token = params.get("token_hash");
  const type = params.get("type");
  const next = safeRedirect(params.get("next"));
  const supabase = await createClient();
  const emailType = type === "email" || type === "signup" || type === "recovery";
  // Email links carry their own one-time proof. They must also work when the
  // mail app opens a different browser without the signup PKCE verifier cookie.
  const validEmail = token && token.length <= 256 && emailType && !code;
  const validCode = code && code.length < 2048 && !token && !type;
  if (supabase && (validEmail || validCode)) {
    const { data, error } = validEmail
      ? await supabase.auth.verifyOtp({ token_hash: token, type })
      : await supabase.auth.exchangeCodeForSession(code!);
    if (!error && data.user) {
      const profile = await supabase.rpc("ensure_profile");
      if (profile.error) return NextResponse.redirect(new URL("/login?error=link", siteOrigin()));
      const recovery = validEmail ? type === "recovery" : next === "/reset-password";
      if (recovery) await markRecovery(data.user.id);
      const response = NextResponse.redirect(new URL(recovery ? "/reset-password" : next, siteOrigin()));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", siteOrigin()));
}
