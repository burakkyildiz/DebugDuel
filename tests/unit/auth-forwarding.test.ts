import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
vi.mock("server-only", () => ({}));
import { authForwardingFetch } from "@/lib/supabase/auth-forwarding";

const env = { url: "https://project.supabase.co", key: "sb_publishable_synthetic_public_key" };
const secret = "sb_secret_" + "synthetic".repeat(5);
const userId = "123e4567-e89b-42d3-a456-426614174000";
const token = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ sub: userId, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url"),
  "synthetic-signature",
].join(".");
const source = (ip = "203.0.113.8") => new Headers({ "x-vercel-forwarded-for": ip });
const sdkHeaders = { apikey: env.key, Authorization: `Bearer ${env.key}` };

beforeEach(() => {
  vi.stubEnv("AUTH_IP_FORWARDING_ENABLED", "true");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("SUPABASE_AUTH_SECRET_KEY", secret);
});
afterEach(() => vi.unstubAllEnvs());

it("leaves local/disabled deployments on the original transport", () => {
  vi.stubEnv("AUTH_IP_FORWARDING_ENABLED", "false");
  vi.stubEnv("VERCEL", "0");
  vi.stubEnv("SUPABASE_AUTH_SECRET_KEY", "");
  const upstream = vi.fn<typeof fetch>();
  expect(authForwardingFetch(env, new Headers(), upstream)).toBe(upstream);
});

it.each(["", "unknown", "203.0.113.8, 198.51.100.2", "127.0.0.1:3000", "fe80::1%en0"])("rejects an untrusted or malformed platform IP: %s", ip => {
  expect(() => authForwardingFetch(env, source(ip))).toThrow("AUTH_FORWARDING_UNAVAILABLE");
});

it("does not fall back to spoofable generic forwarding headers or other hosts", () => {
  expect(() => authForwardingFetch(env, new Headers({ "x-forwarded-for": "203.0.113.8", "sb-forwarded-for": "203.0.113.8" }))).toThrow();
  vi.stubEnv("VERCEL", "0");
  expect(() => authForwardingFetch(env, source())).toThrow();
});

it.each(["", "legacy-service-role-jwt", "sb_secret_short", "sb_secret_" + "placeholder".repeat(4)])("fails closed for missing or unsupported credentials: %s", value => {
  vi.stubEnv("SUPABASE_AUTH_SECRET_KEY", value);
  expect(() => authForwardingFetch(env, source())).toThrow("AUTH_FORWARDING_UNAVAILABLE");
});

it("does not implicitly reuse the privileged database key", () => {
  vi.stubEnv("SUPABASE_AUTH_SECRET_KEY", "");
  vi.stubEnv("SUPABASE_SECRET_KEY", secret);
  expect(() => authForwardingFetch(env, source())).toThrow("AUTH_FORWARDING_UNAVAILABLE");
});

it.each(["http://project.supabase.co", "https://user:pass@project.supabase.co", "https://project.supabase.co/unexpected", "https://project.supabase.co/?query=1"])("rejects a noncanonical upstream configuration: %s", url => {
  expect(() => authForwardingFetch({ ...env, url }, source())).toThrow("AUTH_FORWARDING_UNAVAILABLE");
});

it.each(["203.0.113.8", "2001:db8::42"])("forwards the trusted IPv4/IPv6 address only to user Auth: %s", async ip => {
  const upstream = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}"));
  const wrapped = authForwardingFetch(env, source(ip), upstream);
  await wrapped(env.url + "/auth/v1/token?grant_type=password", { method: "POST", headers: sdkHeaders, body: "{}", redirect: "follow" });
  const [, options] = upstream.mock.calls[0];
  const headers = new Headers(options?.headers);
  expect(headers.get("apikey")).toBe(secret);
  expect(headers.get("authorization")).toBe(`Bearer ${secret}`);
  expect(headers.get("sb-forwarded-for")).toBe(ip);
  expect(options?.redirect).toBe("error");
  expect(sdkHeaders.apikey).toBe(env.key);
});

it.each([
  ["https://other.example/auth/v1/token", "POST"],
  [env.url + "/auth/v1/admin/users", "POST"],
  [env.url + "/rest/v1/rpc/match_command", "POST"],
  [env.url + "/storage/v1/object/private", "POST"],
  [env.url + "/functions/v1/example", "POST"],
  [env.url + "/auth/v1/token", "GET"],
])("never upgrades privileges for %s (%s)", async (url, method) => {
  const upstream = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}"));
  const options = { method, headers: sdkHeaders };
  await authForwardingFetch(env, source(), upstream)(url, options);
  expect(upstream).toHaveBeenCalledWith(url, options);
  expect(new Headers(upstream.mock.calls[0][1]?.headers).get("apikey")).toBe(env.key);
  expect(new Headers(upstream.mock.calls[0][1]?.headers).has("sb-forwarded-for")).toBe(false);
});

it("preserves the user's JWT and Request input for authenticated Auth operations", async () => {
  const upstream = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}"));
  const controller = new AbortController();
  const request = new Request(env.url + "/auth/v1/user", { headers: { ...sdkHeaders, Authorization: `Bearer ${token}` }, signal: controller.signal });
  await authForwardingFetch(env, source(), upstream)(request);
  const [input, options] = upstream.mock.calls[0];
  expect(input).toBe(request);
  expect(new Headers(options?.headers).get("Authorization")).toBe(`Bearer ${token}`);
  expect(new Headers(options?.headers).get("apikey")).toBe(secret);
  controller.abort();
  expect(request.signal.aborted).toBe(true);
});

it("does not let the private API key replace a missing user identity", () => {
  const upstream = vi.fn<typeof fetch>();
  const wrapped = authForwardingFetch(env, source(), upstream);
  for (const path of ["user", "logout", "reauthenticate"]) {
    const method = path === "logout" ? "POST" : "GET";
    expect(() => wrapped(env.url + "/auth/v1/" + path, { method, headers: sdkHeaders })).toThrow("AUTH_FORWARDING_SESSION_REQUIRED");
  }
  expect(upstream).not.toHaveBeenCalled();
});

it("keeps concurrent request IPs isolated without mutating shared headers", async () => {
  const seen: string[] = [];
  const upstream: typeof fetch = async (_input, init) => {
    seen.push(new Headers(init?.headers).get("sb-forwarded-for")!);
    return new Response("{}");
  };
  await Promise.all(["203.0.113.8", "198.51.100.2"].map(ip => authForwardingFetch(env, source(ip), upstream)(env.url + "/auth/v1/token", { method: "POST", headers: sdkHeaders })));
  expect(seen.sort()).toEqual(["198.51.100.2", "203.0.113.8"]);
  expect(new Headers(sdkHeaders).has("sb-forwarded-for")).toBe(false);
});

it("with the real SDK, forwards login/refresh while SQL keeps the public key and the user JWT", async () => {
  const requests: Request[] = [];
  const upstream: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    const path = new URL(request.url).pathname;
    const user = { id: userId, aud: "authenticated", created_at: "2026-01-01T00:00:00Z" };
    const body = path === "/auth/v1/token"
      ? { access_token: token, refresh_token: "synthetic-refresh", expires_in: 3600, token_type: "bearer", user }
      : path === "/auth/v1/user" ? user : [{ xp: 0 }];
    return Response.json(body);
  };
  const client = createClient(env.url, env.key, {
    global: { fetch: authForwardingFetch(env, source(), upstream) },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  expect((await client.auth.signInWithPassword({ email: "synthetic@example.invalid", password: "synthetic" })).error).toBeNull();
  expect((await client.auth.refreshSession()).error).toBeNull();
  expect((await client.auth.getUser()).error).toBeNull();
  expect((await client.from("profiles").select("xp")).error).toBeNull();
  expect(requests.filter(r => new URL(r.url).pathname === "/auth/v1/token")).toHaveLength(2);
  for (const request of requests.filter(r => new URL(r.url).pathname.startsWith("/auth/"))) {
    expect(request.headers.get("apikey")).toBe(secret);
    expect(request.headers.get("sb-forwarded-for")).toBe("203.0.113.8");
    expect(request.redirect).toBe("error");
  }
  const dbRequest = requests.find(r => new URL(r.url).pathname.startsWith("/rest/"))!;
  expect(dbRequest.headers.get("apikey")).toBe(env.key);
  expect(dbRequest.headers.get("Authorization")).toBe(`Bearer ${token}`);
  expect(dbRequest.headers.has("sb-forwarded-for")).toBe(false);
});

it("with real SSR cookies, a later request retains the user's identity without storing the Auth key or IP", async () => {
  const jar = new Map<string, string>();
  const requests: Request[] = [];
  const user = { id: userId, aud: "authenticated", created_at: "2026-01-01T00:00:00Z" };
  const upstream: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    const path = new URL(request.url).pathname;
    return Response.json(path === "/auth/v1/token"
      ? { access_token: token, refresh_token: "synthetic-refresh", expires_in: 3600, token_type: "bearer", user }
      : path === "/auth/v1/user" ? user : []);
  };
  const client = () => createServerClient(env.url, env.key, {
    global: { fetch: authForwardingFetch(env, source(), upstream) },
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: values => { for (const { name, value, options } of values) { if (options.maxAge === 0) jar.delete(name); else jar.set(name, value); } },
    },
  });
  expect((await client().auth.signInWithPassword({ email: "synthetic@example.invalid", password: "synthetic" })).error).toBeNull();
  expect(jar.size).toBeGreaterThan(0);
  expect((await client().auth.getUser()).data.user?.id).toBe(userId);
  expect((await client().rpc("ensure_profile")).error).toBeNull();
  const dbRequest = requests.find(r => new URL(r.url).pathname === "/rest/v1/rpc/ensure_profile")!;
  expect(dbRequest.headers.get("apikey")).toBe(env.key);
  expect(dbRequest.headers.get("Authorization")).toBe(`Bearer ${token}`);
  const serialized = JSON.stringify([...jar]);
  expect(serialized).not.toContain(secret);
  expect(serialized).not.toContain("203.0.113.8");
});
