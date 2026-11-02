const exactPaths = new Set(["/", "/profile", "/history", "/onboarding", "/invite", "/play", "/practice", "/reset-password"]);

export function safeRedirect(value: unknown, fallback = "/profile"): string {
  if (typeof value !== "string" || value.length > 256) return fallback;
  // Allow only canonical, query-free internal paths. Raw invitation tokens never enter OAuth URLs.
  if (exactPaths.has(value) || /^\/match\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\/results)?$/i.test(value)) return value;
  return fallback;
}
