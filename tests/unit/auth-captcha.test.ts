import { beforeEach, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({ signInWithPassword: vi.fn(), signUp: vi.fn(), resend: vi.fn(), resetPasswordForEmail: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: provider, rpc: provider.rpc }) }));
vi.mock("@/lib/security/recovery", () => ({ clearRecovery: vi.fn(), validRecovery: vi.fn() }));
vi.mock("@/lib/supabase/provider-settings", () => ({ githubProviderEnabled: vi.fn() }));
import { POST } from "@/app/api/auth/[action]/route";
import { contentSecurityPolicy } from "@/lib/security/csp";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
  for (const method of Object.values(provider)) method.mockReset().mockResolvedValue({ error: null });
});
function request(action: string, captchaToken?: string) {
  const body = { email: "captcha@example.invalid", ...(["signup", "login"].includes(action) ? { password: "long-test-password" } : {}), ...(captchaToken !== undefined ? { captchaToken } : {}) };
  return POST(new Request(`http://localhost:3000/api/auth/${action}`, { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ action }) });
}
it.each(["login", "signup", "resend", "forgot"])("requires a token before contacting Auth for %s", async action => {
  const response = await request(action);
  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe("CAPTCHA_REQUIRED");
  for (const method of Object.values(provider)) expect(method).not.toHaveBeenCalled();
});
it.each(["login", "signup", "resend", "forgot"])("preserves upstream CAPTCHA rejection for %s", async action => {
  for (const method of Object.values(provider)) method.mockResolvedValue({ error: { status: 500, code: "captcha_failed" } });
  const response = await request(action, "untrusted-token");
  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe("CAPTCHA_FAILED");
});
it.each(["login", "signup", "resend", "forgot"])("forwards the single-use token for %s", async action => {
  expect((await request(action, "challenge-token")).status).toBe(200);
  const method = { login: provider.signInWithPassword, signup: provider.signUp, resend: provider.resend, forgot: provider.resetPasswordForEmail }[action]!;
  const args = method.mock.calls[0];
  expect((action === "forgot" ? args[1] : args[0].options).captchaToken).toBe("challenge-token");
});
it.each(["", " ", "x".repeat(2049)])("rejects malformed tokens before Auth", async token => {
  expect((await request("signup", token)).status).toBe(400);
  expect(provider.signUp).not.toHaveBeenCalled();
});
it("keeps the script nonce policy while allowing only the challenge frame", () => {
  const csp = contentSecurityPolicy("test-nonce");
  expect(csp).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
  expect(csp).toContain("frame-src https://challenges.cloudflare.com");
  expect(csp).not.toContain("script-src 'unsafe-inline'");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  expect(contentSecurityPolicy("test-nonce")).toContain("frame-src 'none'");
});
