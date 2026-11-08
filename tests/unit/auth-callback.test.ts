import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn(), rpc: vi.fn(), markRecovery: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: mocks, rpc: mocks.rpc }) }));
vi.mock("@/lib/security/recovery", () => ({ markRecovery: mocks.markRecovery }));
import { GET } from "@/app/auth/callback/route";

const origin = "https://duel.example";
function callback(query: Record<string, string>) {
  return GET(new Request(`${origin}/auth/callback?${new URLSearchParams(query)}`));
}
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
  vi.clearAllMocks();
  for (const fn of [mocks.verifyOtp, mocks.exchangeCodeForSession]) fn.mockResolvedValue({ data: { user: { id: "actor" } }, error: null });
  mocks.rpc.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

it("verifies an email link without a PKCE cookie and preserves the safe invite destination", async () => {
  const response = await callback({ token_hash: "one-time-proof", type: "email", next: "/invite" });
  expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "one-time-proof", type: "email" });
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  expect(mocks.rpc).toHaveBeenCalledWith("ensure_profile");
  expect(response.headers.get("location")).toBe(origin + "/invite");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("grants a recovery marker only for a verified recovery email and forces the reset destination", async () => {
  const response = await callback({ token_hash: "recovery-proof", type: "recovery", next: "/play" });
  expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "recovery-proof", type: "recovery" });
  expect(mocks.markRecovery).toHaveBeenCalledWith("actor");
  expect(response.headers.get("location")).toBe(origin + "/reset-password");
});

it("does not let a signup email acquire recovery authority through next", async () => {
  await callback({ token_hash: "signup-proof", type: "email", next: "/reset-password" });
  expect(mocks.markRecovery).not.toHaveBeenCalled();
});

it("keeps OAuth code exchange and rejects external redirect destinations", async () => {
  const response = await callback({ code: "oauth-code", next: "https://other.example" });
  expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
  expect(mocks.verifyOtp).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toBe(origin + "/profile");
});

it("rejects mixed, missing, oversized or unsupported proofs without provider calls", async () => {
  const invalid: Record<string, string>[] = [
    { token_hash: "proof", type: "email", code: "code" },
    { token_hash: "proof", type: "invite" },
    { token_hash: "x".repeat(257), type: "email" },
    { token_hash: "", type: "email" },
    { code: "code", type: "recovery" },
    {},
  ];
  for (const query of invalid) expect((await callback(query)).headers.get("location")).toBe(origin + "/login?error=link");
  expect(mocks.verifyOtp).not.toHaveBeenCalled();
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("does not create a profile or recovery marker for a consumed or invalid proof", async () => {
  mocks.verifyOtp.mockResolvedValue({ data: { user: null }, error: { code: "otp_expired" } });
  expect((await callback({ token_hash: "used", type: "recovery" })).headers.get("location")).toBe(origin + "/login?error=link");
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.markRecovery).not.toHaveBeenCalled();
});

it("reports profile setup failure without returning a successful destination", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "unavailable" } });
  expect((await callback({ token_hash: "proof", type: "email" })).headers.get("location")).toBe(origin + "/login?error=link");
});
