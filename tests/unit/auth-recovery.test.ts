import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), validRecovery: vi.fn(), clearRecovery: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/security/recovery", () => ({ validRecovery: mocks.validRecovery, clearRecovery: mocks.clearRecovery }));
vi.mock("@/lib/supabase/provider-settings", () => ({ githubProviderEnabled: vi.fn() }));
import { POST } from "@/app/api/auth/[action]/route";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  vi.resetAllMocks();
  mocks.createClient.mockResolvedValue({ auth: mocks });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "recovery-user" } }, error: null });
  mocks.validRecovery.mockResolvedValue(true);
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
});
function reset() {
  return POST(new Request("http://localhost:3000/api/auth/reset", {
    method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
    body: JSON.stringify({ password: "new-long-test-password" }),
  }), { params: Promise.resolve({ action: "reset" }) });
}
it.each(["getUser", "updateUser"] as const)("preserves recovery and reports dependency failure in %s", async method => {
  mocks[method].mockResolvedValue({ data: { user: null }, error: { status: 503 } });
  expect((await reset()).status).toBe(503);
  expect(mocks.clearRecovery).not.toHaveBeenCalled();
  expect(mocks.signOut).not.toHaveBeenCalled();
});
it.each(["getUser", "updateUser"] as const)("preserves rate limiting in %s", async method => {
  mocks[method].mockResolvedValue({ data: { user: null }, error: { status: 429 } });
  const response = await reset();
  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("60");
  expect(mocks.clearRecovery).not.toHaveBeenCalled();
});
it("does not update passwords without recovery authorization", async () => {
  mocks.validRecovery.mockResolvedValue(false);
  expect((await reset()).status).toBe(401);
  expect(mocks.updateUser).not.toHaveBeenCalled();
});
it("handles client initialization failures as temporary unavailability", async () => {
  mocks.createClient.mockRejectedValue(new Error("configuration unavailable"));
  expect((await reset()).status).toBe(503);
});
it.each([false, true])("reports password commit separately from failed session revocation (throws: %s)", async throws => {
  if (throws) mocks.signOut.mockRejectedValue(new Error("network failure"));
  else mocks.signOut.mockResolvedValue({ error: { status: 503 } });
  const response = await reset();
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe("PASSWORD_UPDATED_SIGN_OUT_FAILED");
  expect(mocks.clearRecovery).toHaveBeenCalledOnce();
});
it("completes recovery and signs out after the password changes", async () => {
  const response = await reset();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ redirect: "/login?updated=1" });
  expect(mocks.clearRecovery).toHaveBeenCalledOnce();
  expect(mocks.signOut).toHaveBeenCalledOnce();
});
