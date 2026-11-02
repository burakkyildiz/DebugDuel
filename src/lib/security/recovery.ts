import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "dd-recovery";
function signature(value: string) {
  const secret = process.env.GUEST_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Recovery configuration unavailable");
  return createHmac("sha256", secret).update(`recovery:${value}`).digest("hex");
}
export async function markRecovery(userId: string) {
  const value = `${userId}.${Date.now() + 600_000}`;
  (await cookies()).set(COOKIE, `${value}.${signature(value)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
}
export async function validRecovery(userId: string) {
  const raw = (await cookies()).get(COOKIE)?.value ?? "";
  const [id, expiry, sig] = raw.split(".");
  if (id !== userId || !expiry || !sig || !/^\d+$/.test(expiry) || Number(expiry) <= Date.now() || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const expected = signature(`${id}.${expiry}`);
  return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
}
export async function clearRecovery() { (await cookies()).delete(COOKIE); }
