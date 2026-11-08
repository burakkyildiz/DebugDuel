import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { seal } from "@/lib/security/sealed";
import { inviteTokenSchema } from "@/features/matches/contracts";
import { publicSupabaseEnv } from "@/lib/env";
import { contentSecurityPolicy } from "@/lib/security/csp";
import { authForwardingFetch } from "@/lib/supabase/auth-forwarding";

export async function proxy(request: NextRequest) {
  const csp = contentSecurityPolicy(Buffer.from(crypto.randomUUID()).toString("base64"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  const nextResponse = () => {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  if (request.nextUrl.pathname.startsWith("/invite/")) {
    const token = request.nextUrl.pathname.slice("/invite/".length);
    const target = new URL("/invite", request.url);
    const response = NextResponse.redirect(target, 303);
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    if (inviteTokenSchema.safeParse(token).success) {
      try {
        response.cookies.set("dd_pending_invite", seal({ token, expiresAt: Date.now() + 900000 }, "debug-duel:pending-invite:v1", process.env.GUEST_SESSION_SECRET), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 900 });
      } catch { response.cookies.delete("dd_pending_invite"); }
    } else response.cookies.delete("dd_pending_invite");
    return response;
  }
  let response = nextResponse();
  const env = publicSupabaseEnv();
  if (!env) return response;
  const supabase = createServerClient(env.url, env.key, {
    global: { fetch: authForwardingFetch(env, request.headers) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        requestHeaders.set("cookie", request.cookies.toString());
        response = nextResponse();
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"] };
