import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { seal, unseal } from "@/lib/security/sealed";
import { answerBody, matchEmptyBody, readyBody } from "@/features/matches/contracts";
const secret = "a".repeat(64);
describe("invitation and receipt encryption", () => {
  it("uses fresh authenticated encryption and binds actor, action and command", () => {
    const value = { token: "private-invite-token" };
    const purpose = "receipt:create:actor:command";
    const sealed = seal(value, purpose, secret);
    expect(unseal(sealed, purpose, secret)).toEqual(value);
    expect(seal(value, purpose, secret)).not.toBe(sealed);
    expect(sealed).not.toContain(value.token);
    for (const other of ["receipt:invite:actor:command", "receipt:create:outsider:command", "receipt:create:actor:other", "debug-duel:pending-invite:v1"]) expect(() => unseal(sealed, other, secret)).toThrow();
    expect(() => unseal(sealed, purpose, "b".repeat(64))).toThrow();
    const raw = Buffer.from(sealed, "base64url"); raw[28] ^= 1;
    expect(() => unseal(raw.toString("base64url"), purpose, secret)).toThrow();
  });
  it("rejects malformed input and missing configuration", () => {
    for (const value of ["", "invalid", "x".repeat(4097), "not+url/safe="]) expect(() => unseal(value, "purpose", secret)).toThrow();
    for (const key of [undefined, "short", "placeholder".repeat(8)]) expect(() => seal({}, "purpose", key)).toThrow();
  });
});
describe("match mutation contracts", () => {
  it("rejects client identity, scoring, clocks and malformed answers", () => {
    expect(matchEmptyBody.safeParse({ userId: crypto.randomUUID() }).success).toBe(false);
    expect(readyBody.safeParse({ ready: true, lastSeenAt: new Date().toISOString() }).success).toBe(false);
    const answer = { roundId: crypto.randomUUID(), selectedLine: 4 };
    expect(answerBody.safeParse(answer).success).toBe(true);
    for (const field of ["userId", "score", "isCorrect", "acceptedAt"]) expect(answerBody.safeParse({ ...answer, [field]: true }).success).toBe(false);
    for (const line of [0, -1, 1.5, "4", Infinity]) expect(answerBody.safeParse({ ...answer, selectedLine: line }).success).toBe(false);
  });
});
