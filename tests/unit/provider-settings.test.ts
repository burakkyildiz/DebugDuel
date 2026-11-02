import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { githubProviderEnabled } from "@/lib/supabase/provider-settings";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it.each([true, false])("checks the provider flag before OAuth redirect: %s", async enabled => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ external: { github: enabled } })));
  expect(await githubProviderEnabled()).toBe(enabled);
});
it("fails closed when provider settings are unavailable", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  expect(await githubProviderEnabled()).toBe(false);
});
