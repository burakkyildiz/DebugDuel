import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const provider = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: provider, rpc: provider.rpc }) }));
import { matchRequest } from "@/lib/matches/server";
beforeEach(() => { vi.resetAllMocks(); });
it.each([{ status: 503 }, { status: 0 }])("does not report a signed-out user during an Auth outage: %j", async error => {
  provider.getUser.mockResolvedValue({ data: { user: null }, error });
  const response = await matchRequest(new Request("http://localhost/api/matches/active"), "active");
  expect(response.status).toBe(503);
  expect(provider.rpc).not.toHaveBeenCalled();
});
it("preserves Auth rate limiting", async () => {
  provider.getUser.mockResolvedValue({ data: { user: null }, error: { status: 429 } });
  expect((await matchRequest(new Request("http://localhost/api/matches/active"), "active")).status).toBe(429);
  expect(provider.rpc).not.toHaveBeenCalled();
});
it("still rejects an absent session", async () => {
  provider.getUser.mockResolvedValue({ data: { user: null }, error: { status: 400, name: "AuthSessionMissingError" } });
  expect((await matchRequest(new Request("http://localhost/api/matches/active"), "active")).status).toBe(401);
  expect(provider.rpc).not.toHaveBeenCalled();
});
