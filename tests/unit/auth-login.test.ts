import { beforeEach, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({ signInWithPassword: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: provider, rpc: provider.rpc }) }));
vi.mock("@/lib/security/recovery", () => ({ clearRecovery: vi.fn(), validRecovery: vi.fn() }));
vi.mock("@/lib/supabase/provider-settings", () => ({ githubProviderEnabled: vi.fn() }));
import { POST } from "@/app/api/auth/[action]/route";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  provider.signInWithPassword.mockReset();
  provider.rpc.mockReset().mockResolvedValue({ error: null });
});

function login() {
  return POST(new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
    body: JSON.stringify({ email: "login-test@example.invalid", password: "synthetic-password" }),
  }), { params: Promise.resolve({ action: "login" }) });
}

it.each([{ status: 429 }, { status: 400, code: "over_request_rate_limit" }])("preserves rate limiting and retry guidance: %j", async error => {
  provider.signInWithPassword.mockResolvedValue({ error });
  const response = await login();
  expect(response.status).toBe(429);
  expect((await response.json()).error.code).toBe("RATE_LIMITED");
  expect(response.headers.get("Retry-After")).toBe("60");
  expect(provider.rpc).not.toHaveBeenCalled();
});

it.each([{ status: 500 }, { status: 503 }, { name: "AuthRetryableFetchError", status: 0 }])("reports an unavailable dependency rather than bad credentials: %j", async error => {
  provider.signInWithPassword.mockResolvedValue({ error });
  const response = await login();
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe("AUTH_UNAVAILABLE");
  expect(provider.rpc).not.toHaveBeenCalled();
});

it.each(["invalid_credentials", "email_not_confirmed", "user_banned", "user_not_found"])("keeps identity failures neutral: %s", async code => {
  provider.signInWithPassword.mockResolvedValue({ error: { status: 400, code } });
  const response = await login();
  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe("SIGN_IN_FAILED");
  expect(response.headers.get("Retry-After")).toBeNull();
  expect(provider.rpc).not.toHaveBeenCalled();
});

it("keeps successful login and profile setup working", async () => {
  provider.signInWithPassword.mockResolvedValue({ error: null });
  const response = await login();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ redirect: "/profile" });
  expect(provider.rpc).toHaveBeenCalledWith("ensure_profile");
});
