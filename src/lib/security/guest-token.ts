import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const GUEST_COOKIE = "dd_practice_guest";
export const GUEST_LIFETIME = 86400;
function mac(value: string, secret: string) { return createHmac("sha256", secret).update(value).digest("base64url"); }
export function signGuest(secret: string, now = Date.now()) {
  const body = `${randomBytes(32).toString("base64url")}.${Math.floor(now / 1000)}`;
  return `${body}.${mac(body, secret)}`;
}
export function guestSubject(token: string | undefined, secret: string, now = Date.now()): string | null {
  if (!token || token.length > 160) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^[A-Za-z0-9_-]{43}$/.test(parts[0]) || !/^\d{10}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) return null;
  const issued = Number(parts[1]);
  if (issued > Math.floor(now / 1000) || Math.floor(now / 1000) - issued >= GUEST_LIFETIME) return null;
  const expected = mac(`${parts[0]}.${parts[1]}`, secret);
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]))) return null;
  return createHmac("sha256", secret).update(`guest:${parts[0]}`).digest("hex");
}
export function subjectHash(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}
