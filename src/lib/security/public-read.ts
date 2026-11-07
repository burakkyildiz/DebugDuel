import "server-only";
import { createHmac } from "node:crypto";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

export class PublicReadLimited extends Error {}

// Only Vercel's overwritten header is authoritative. Other hosts share a bucket.
export async function admitPublicRead(headers: Headers, action: "leaderboard" | "health") {
  const secret = process.env.RATE_LIMIT_HASH_SECRET;
  const client = createPrivilegedClient();
  if (!client || !secret || secret.length < 32 || secret.includes("placeholder")) throw new Error("ADMISSION_UNAVAILABLE");
  const ip = process.env.VERCEL === "1" ? headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : null;
  const subject = createHmac("sha256", secret).update(`public-read:${ip || "unverified-network"}`).digest("hex");
  const { data, error } = await client.rpc("public_read_admission", { p_subject: subject, p_action: action });
  if (error || typeof data !== "boolean") throw new Error("ADMISSION_UNAVAILABLE");
  if (!data) throw new PublicReadLimited();
}
