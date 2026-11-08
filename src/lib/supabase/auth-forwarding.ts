import "server-only";
import { isIP } from "node:net";

// These are user Auth operations, never admin, SQL/RPC, Storage or Functions.
const authMethods = new Map<string, readonly string[]>([
  ["/auth/v1/token", ["POST"]],
  ["/auth/v1/signup", ["POST"]],
  ["/auth/v1/verify", ["POST"]],
  ["/auth/v1/recover", ["POST"]],
  ["/auth/v1/resend", ["POST"]],
  ["/auth/v1/user", ["GET", "PUT"]],
  ["/auth/v1/logout", ["POST"]],
  ["/auth/v1/reauthenticate", ["GET"]],
]);
const sessionPaths = new Set(["/auth/v1/user", "/auth/v1/logout", "/auth/v1/reauthenticate"]);

export function authForwardingEnabled() {
  return process.env.AUTH_IP_FORWARDING_ENABLED === "true";
}

/** Keep the SDK's public API key and user JWT for every database operation. */
export function authForwardingFetch(
  env: { url: string; key: string },
  incoming: Headers,
  upstream: typeof fetch = fetch,
): typeof fetch {
  if (!authForwardingEnabled()) return upstream;
  const ip = incoming.get("x-vercel-forwarded-for")?.trim() ?? "";
  // Separate configuration prevents an Auth-only test deployment from enabling
  // the privileged database/guest client as a side effect.
  const secret = process.env.SUPABASE_AUTH_SECRET_KEY;
  const base = new URL(env.url);
  // Never trust a caller-supplied generic X-Forwarded-For or a list of addresses.
  if (process.env.VERCEL !== "1" || !isIP(ip) || ip.includes("%") || ip.length > 45
    || !secret || !/^sb_secret_[A-Za-z0-9_-]{24,}$/.test(secret) || secret.includes("placeholder")
    || base.protocol !== "https:" || base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
    throw new Error("AUTH_FORWARDING_UNAVAILABLE");
  }

  return (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (url.origin !== base.origin || url.username || url.password || !authMethods.get(url.pathname)?.includes(method)) {
      return upstream(input, init);
    }

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const authorization = headers.get("Authorization");
    const publicBearer = `Bearer ${env.key}`;
    // Auth user operations must still carry their session JWT. The API key must
    // not become a replacement identity when a session is missing.
    if (sessionPaths.has(url.pathname) && (!authorization || authorization === publicBearer)) {
      throw new Error("AUTH_FORWARDING_SESSION_REQUIRED");
    }
    headers.set("apikey", secret);
    headers.set("Sb-Forwarded-For", ip);
    if (!authorization || authorization === publicBearer) headers.set("Authorization", `Bearer ${secret}`);
    // A redirect must never forward our private apikey header to another host.
    return upstream(input, { ...init, headers, redirect: "error" });
  };
}
