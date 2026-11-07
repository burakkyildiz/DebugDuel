import { publicSupabaseEnv } from "@/lib/env";

export function contentSecurityPolicy(nonce: string) {
  const env = publicSupabaseEnv();
  const origin = env ? new URL(env.url).origin : null;
  const socket = origin?.replace(/^http/, "ws");
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // React style attributes are used for progress displays; scripts remain nonce-bound.
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${[origin, socket, dev ? "ws://localhost:* ws://127.0.0.1:*" : null].filter(Boolean).join(" ")}`,
    "img-src 'self' data: blob:", "font-src 'self'", "object-src 'none'",
    "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
  ].join("; ");
}
