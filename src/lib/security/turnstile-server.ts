import "server-only";
import { siteOrigin } from "@/lib/env";

// Forwarded Auth uses a privileged API key, so Supabase can bypass its CAPTCHA
// middleware. Verify before that boundary; never trust a merely nonempty token.
export async function verifyTurnstile(token: string): Promise<"valid" | "invalid" | "unavailable"> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || secret.includes("placeholder")) return "unavailable";
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }), cache: "no-store",
      redirect: "error", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return "unavailable";
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("success" in result) || typeof result.success !== "boolean") return "unavailable";
    if (!result.success) {
      if ("error-codes" in result && Array.isArray(result["error-codes"]) && result["error-codes"].some(code => ["missing-input-secret", "invalid-input-secret", "internal-error"].includes(code))) return "unavailable";
      return "invalid";
    }
    if (!("hostname" in result) || result.hostname !== new URL(siteOrigin()).hostname) return "invalid";
    return "valid";
  } catch { return "unavailable"; }
}
