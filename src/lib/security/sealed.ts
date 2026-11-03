import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey(secret: string | undefined) {
  if (!secret || secret.length < 32 || secret.includes("placeholder")) throw new Error("ENCRYPTION_UNAVAILABLE");
  return createHash("sha256").update(secret).digest();
}
export function seal(value: unknown, purpose: string, secret: string | undefined): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  cipher.setAAD(Buffer.from(purpose));
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}
export function unseal(value: string, purpose: string, secret: string | undefined): unknown {
  if (value.length > 4096 || !/^[\w-]+$/.test(value)) throw new Error("INVALID_CAPABILITY");
  const input = Buffer.from(value, "base64url");
  if (input.length < 29) throw new Error("INVALID_CAPABILITY");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), input.subarray(0, 12));
  decipher.setAAD(Buffer.from(purpose));
  decipher.setAuthTag(input.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(input.subarray(28)), decipher.final()]).toString("utf8"));
}
