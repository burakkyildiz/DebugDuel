import { beforeEach, describe, expect, it, vi } from "vitest";
import { emailRequestResult } from "@/lib/validation/auth-errors";
vi.mock("server-only", () => ({}));

const providerSettings = vi.hoisted(() => ({ githubProviderEnabled: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/supabase/provider-settings", () => providerSettings);
const provider = vi.hoisted(() => ({ signUp: vi.fn(), resetPasswordForEmail: vi.fn(), resend: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: provider }) }));
vi.mock("@/lib/security/recovery", () => ({ clearRecovery: vi.fn(), validRecovery: vi.fn() }));
import { POST } from "@/app/api/auth/[action]/route";

async function request(action: string, extra: Record<string, unknown> = {}) {
  const body = { email: "delivery-test@example.invalid", ...(action === "signup" ? { password: "a-long-example-password" } : {}), ...extra };
  return POST(new Request("http://localhost:3000/api/auth/" + action, { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ action }) });
}

beforeEach(() => {
  providerSettings.githubProviderEnabled.mockResolvedValue(true);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  for (const method of Object.values(provider)) method.mockReset().mockResolvedValue({ error: null });
});

describe.each(["signup", "forgot", "resend"])("%s email delivery", action => {
  it("reports provider failure instead of false success", async () => {
    for (const method of Object.values(provider)) method.mockResolvedValue({ error: { status: 500, code: "unexpected_failure" } });
    const response = await request(action);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("EMAIL_UNAVAILABLE");
    expect(body.confirmation).toBeUndefined();
  });
  it("returns rate-limit feedback and retry guidance", async () => {
    for (const method of Object.values(provider)) method.mockResolvedValue({ error: { status: 429 } });
    const response = await request(action);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
  });
  it("does not claim the shared email quota resets after 60 seconds", async () => {
    for (const method of Object.values(provider)) method.mockResolvedValue({ error: { status: 429, code: "over_email_send_rate_limit" } });
    const response = await request(action);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeNull();
    expect((await response.json()).error.message).toContain("Email sending");
  });
  it("keeps existing/missing account responses neutral", async () => {
    for (const method of Object.values(provider)) method.mockResolvedValue({ error: { status: 400, code: action === "signup" ? "user_already_exists" : "user_not_found" } });
    expect(await (await request(action)).json()).toEqual({ confirmation: true });
  });
  it("rejects unknown identity fields before contacting the provider", async () => {
    expect((await request(action, { userId: "other-user" })).status).toBe(400);
    for (const method of Object.values(provider)) expect(method).not.toHaveBeenCalled();
  });
});

it("allows email success and classifies weak passwords as invalid", () => {
  expect(emailRequestResult(null)).toBe("accepted");
  expect(emailRequestResult({ code: "weak_password", status: 422 })).toBe("invalid");
});

it("keeps only a safe canonical destination in signup and resend callbacks", async () => {
  await request("signup", { next: "https://evil.test" });
  expect(provider.signUp.mock.calls[0][0].options.emailRedirectTo).toBe("http://localhost:3000/auth/callback?next=%2Fprofile");
  await request("resend", { next: "/invite" });
  expect(provider.resend.mock.calls[0][0].options.emailRedirectTo).toBe("http://localhost:3000/auth/callback?next=%2Finvite");
});

it("rejects disabled GitHub before generating an OAuth URL", async () => {
  providerSettings.githubProviderEnabled.mockResolvedValue(false);
  const response = await POST(new Request("http://localhost:3000/api/auth/github", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ next: "/profile" }) }), { params: Promise.resolve({ action: "github" }) });
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe("PROVIDER_NOT_ENABLED");
});
