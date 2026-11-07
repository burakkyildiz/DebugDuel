import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ rpc: vi.fn(), available: true }));
vi.mock("@/lib/supabase/privileged", () => ({ createPrivilegedClient: () => state.available ? { rpc: state.rpc } : null }));
import { admitPublicRead, PublicReadLimited } from "@/lib/security/public-read";
import { contentSecurityPolicy } from "@/lib/security/csp";
beforeEach(() => { vi.stubEnv("RATE_LIMIT_HASH_SECRET", "a".repeat(64)); vi.stubEnv("VERCEL", ""); state.available = true; state.rpc.mockReset().mockResolvedValue({ data: true, error: null }); });
afterEach(() => vi.unstubAllEnvs());
describe("public read admission", () => {
  it("ignores spoofed forwarding headers outside the trusted platform", async () => {
    await admitPublicRead(new Headers({ "x-forwarded-for": "1.2.3.4", "x-vercel-forwarded-for": "1.2.3.4" }), "leaderboard");
    await admitPublicRead(new Headers({ "x-forwarded-for": "5.6.7.8", "x-vercel-forwarded-for": "5.6.7.8" }), "leaderboard");
    expect(state.rpc.mock.calls[0]).toEqual(state.rpc.mock.calls[1]);
    expect(state.rpc.mock.calls[0][1].p_subject).toMatch(/^[a-f0-9]{64}$/);
  });
  it("hashes only the trusted network address and separates networks", async () => {
    vi.stubEnv("VERCEL", "1");
    for (const ip of ["1.2.3.4", "5.6.7.8"]) await admitPublicRead(new Headers({ "x-vercel-forwarded-for": ip }), "health");
    expect(state.rpc.mock.calls[0][1].p_subject).not.toBe(state.rpc.mock.calls[1][1].p_subject);
    expect(JSON.stringify(state.rpc.mock.calls)).not.toContain("1.2.3.4");
  });
  it("fails closed on quota, dependency errors, null and missing configuration", async () => {
    state.rpc.mockResolvedValue({ data: false, error: null });
    await expect(admitPublicRead(new Headers(), "leaderboard")).rejects.toBeInstanceOf(PublicReadLimited);
    for (const result of [{ data: null, error: null }, { data: true, error: {} }]) {
      state.rpc.mockResolvedValue(result);
      await expect(admitPublicRead(new Headers(), "leaderboard")).rejects.toThrow("ADMISSION_UNAVAILABLE");
    }
    state.available = false;
    await expect(admitPublicRead(new Headers(), "leaderboard")).rejects.toThrow();
    state.available = true; vi.stubEnv("RATE_LIMIT_HASH_SECRET", "short");
    await expect(admitPublicRead(new Headers(), "leaderboard")).rejects.toThrow();
  });
});
it("limits production script execution and network connections", () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test");
  const policy = contentSecurityPolicy("random-nonce");
  expect(policy).toContain("script-src 'self' 'nonce-random-nonce' 'strict-dynamic';");
  expect(policy).not.toContain("unsafe-eval");
  expect(policy).toContain("connect-src 'self' https://example.supabase.co wss://example.supabase.co;");
  expect(policy).toContain("frame-ancestors 'none'");
});
