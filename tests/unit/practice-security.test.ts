import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { guestSubject, GUEST_LIFETIME, signGuest } from "@/lib/security/guest-token";
import { emptyPracticeBody, practiceAnswerBody, practiceStateSchema } from "@/features/practice/contracts";
const secret = "a".repeat(64);
const now = 1_794_000_000_000;

describe("guest Practice capability", () => {
  it("uses high entropy signed cookies and stores only a stable digest", () => {
    const token = signGuest(secret, now);
    const subject = guestSubject(token, secret, now);
    expect(token.split(".")[0]).toHaveLength(43);
    expect(subject).toMatch(/^[a-f0-9]{64}$/);
    expect(subject).not.toContain(token.split(".")[0]);
    expect(guestSubject(token, secret, now + 1000)).toBe(subject);
    expect(guestSubject(signGuest(secret, now), secret, now)).not.toBe(subject);
  });
  it("rejects tampering, other secrets, expiration and future issuance", () => {
    const token = signGuest(secret, now);
    expect(guestSubject(token.replace(/^./, token[0] === "a" ? "b" : "a"), secret, now)).toBeNull();
    expect(guestSubject(token, "b".repeat(64), now)).toBeNull();
    expect(guestSubject(token, secret, now + GUEST_LIFETIME * 1000)).toBeNull();
    expect(guestSubject(token, secret, now - 1000)).toBeNull();
    expect(guestSubject(token, secret, now + GUEST_LIFETIME * 1000 - 1)).not.toBeNull();
  });
  it.each([undefined, "", "a.b.c", "x".repeat(10000)])("rejects malformed cookie %s", token => expect(guestSubject(token, secret, now)).toBeNull());
});

describe("Practice HTTP contracts", () => {
  it("rejects forged identity, time and scoring fields", () => {
    expect(emptyPracticeBody.safeParse({ userId: crypto.randomUUID() }).success).toBe(false);
    expect(practiceAnswerBody.safeParse({ selectedLine: 4, isCorrect: true }).success).toBe(false);
    expect(practiceAnswerBody.safeParse({ selectedLine: 4, submittedAt: new Date().toISOString() }).success).toBe(false);
    for (const value of [0, -1, 1.5, "4", Infinity]) expect(practiceAnswerBody.safeParse({ selectedLine: value }).success).toBe(false);
  });
  it("rejects premature solution data and hidden fields in the safe DTO", () => {
    const dto = { sessionId: crypto.randomUUID(), serverNow: new Date(now).toISOString(), startsAt: new Date(now).toISOString(), endsAt: new Date(now+45000).toISOString(), identity: "guest", status: "active", question: { title: "Title", prompt: "Prompt", code: "code", lineCount: 1, language: "python" }, selectedLine: null, solution: null };
    expect(practiceStateSchema.safeParse(dto).success).toBe(true);
    expect(practiceStateSchema.safeParse({ ...dto, question: { ...dto.question, correctLine: 1 } }).success).toBe(false);
    expect(practiceStateSchema.safeParse({ ...dto, solution: { correctLine: 1, explanation: "Fix", correctedCode: "fixed", isCorrect: null } }).success).toBe(false);
  });
});
