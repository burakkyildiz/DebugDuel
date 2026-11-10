import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { verifyTurnstile } from "@/lib/security/turnstile-server";
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "synthetic-server-secret");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://game.example.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("sends a token to the fixed Siteverify endpoint and accepts only the intended hostname", async () => {
  fetchMock.mockResolvedValue(Response.json({ success: true, hostname: "game.example.test" }));
  expect(await verifyTurnstile("real-token")).toBe("valid");
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
  expect(JSON.parse(String(init?.body))).toEqual({ secret: "synthetic-server-secret", response: "real-token" });
  expect(init?.redirect).toBe("error");
  fetchMock.mockResolvedValue(Response.json({ success: true, hostname: "other.example.test" }));
  expect(await verifyTurnstile("other-token")).toBe("invalid");
});
it.each(["invalid-input-response", "timeout-or-duplicate"])("rejects invalid or replayed token %s", async code => {
  fetchMock.mockResolvedValue(Response.json({ success: false, "error-codes": [code] }));
  expect(await verifyTurnstile("bad-token")).toBe("invalid");
});
it.each(["missing-input-secret", "invalid-input-secret", "internal-error"])("reports provider/configuration failure %s", async code => {
  fetchMock.mockResolvedValue(Response.json({ success: false, "error-codes": [code] }));
  expect(await verifyTurnstile("token")).toBe("unavailable");
});
it("fails closed on missing secret, network failure, invalid response and upstream 5xx", async () => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  expect(await verifyTurnstile("token")).toBe("unavailable");
  expect(fetchMock).not.toHaveBeenCalled();
  vi.stubEnv("TURNSTILE_SECRET_KEY", "synthetic-server-secret");
  fetchMock.mockRejectedValueOnce(new Error("network"));
  expect(await verifyTurnstile("token")).toBe("unavailable");
  fetchMock.mockResolvedValueOnce(new Response("not json"));
  expect(await verifyTurnstile("token")).toBe("unavailable");
  fetchMock.mockResolvedValueOnce(new Response("", { status: 503 }));
  expect(await verifyTurnstile("token")).toBe("unavailable");
});
