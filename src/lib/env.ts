export function publicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || key.includes("placeholder") || key === "your-publishable-key") return null;
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return null;
    return { url, key };
  } catch { return null; }
}

export function siteOrigin() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").origin;
}
