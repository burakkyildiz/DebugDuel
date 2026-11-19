import { describe, expect, it } from "vitest";
import { createAction, gameLanguages, languageNames, languageSchema } from "@/lib/game/languages";
import { createMatchBody, matchEmptyBody, matchStateSchema } from "@/features/matches/contracts";
import { createPracticeBody, emptyPracticeBody, practiceStateSchema } from "@/features/practice/contracts";

describe("game language selection", () => {
  it("keeps Python on the plain create action and qualifies other languages", () => {
    expect(createAction(undefined)).toBe("create");
    expect(createAction("python")).toBe("create");
    expect(createAction("javascript")).toBe("create:javascript");
    expect(createAction("java")).toBe("create:java");
  });
  it("names every supported language", () => {
    for (const language of gameLanguages) expect(languageNames[language]).toMatch(/\S/);
  });
  it.each(["ruby", "JavaScript", "Java", "java:x", "javascript:x", "python;drop table", "", null, 1])("rejects unsupported language %s", value => {
    expect(languageSchema.safeParse(value).success).toBe(false);
  });
});

describe("create request bodies", () => {
  it("accept an omitted or supported language only", () => {
    for (const schema of [createMatchBody, createPracticeBody]) {
      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ language: "python" }).success).toBe(true);
      expect(schema.safeParse({ language: "javascript" }).success).toBe(true);
      expect(schema.safeParse({ language: "java" }).success).toBe(true);
      expect(schema.safeParse({ language: "ruby" }).success).toBe(false);
      expect(schema.safeParse({ language: "javascript", userId: crypto.randomUUID() }).success).toBe(false);
    }
  });
  it("keep every other command free of a language", () => {
    expect(matchEmptyBody.safeParse({ language: "javascript" }).success).toBe(false);
    expect(emptyPracticeBody.safeParse({ language: "javascript" }).success).toBe(false);
  });
});

describe("question DTO language", () => {
  const now = Date.parse("2026-11-19T10:00:00Z");
  const practice = (language: string) => ({
    sessionId: crypto.randomUUID(), serverNow: new Date(now).toISOString(), startsAt: new Date(now).toISOString(), endsAt: new Date(now + 45000).toISOString(),
    identity: "guest", status: "active", selectedLine: null, solution: null,
    question: { title: "Title", prompt: "Prompt", code: "a\nb\nc\nd\ne", lineCount: 5, language },
  });
  it("accepts supported languages in Practice and rejects others", () => {
    expect(practiceStateSchema.safeParse(practice("python")).success).toBe(true);
    expect(practiceStateSchema.safeParse(practice("javascript")).success).toBe(true);
    expect(practiceStateSchema.safeParse(practice("java")).success).toBe(true);
    expect(practiceStateSchema.safeParse(practice("ruby")).success).toBe(false);
  });
  it("accepts an optional room language in match state", () => {
    const base = { matchId: crypto.randomUUID(), stateVersion: 1, status: "waiting", serverNow: new Date(now).toISOString(), lobbyExpiresAt: new Date(now + 900000).toISOString(), stage: "full_match", host: true,
      roundCount: 3, nextPhaseAt: null, rounds: [], outcome: null, winnerId: null, endedReason: null,
      players: [{ id: crypto.randomUUID(), username: "a", slot: 1, ready: false, lastSeenAt: new Date(now).toISOString(), score: 0, hasSubmitted: false }],
      round: { id: crypto.randomUUID(), number: 1, status: "pending", startsAt: null, endsAt: null, winnerId: null, points: 0 }, self: { id: crypto.randomUUID(), selectedLine: null }, question: null, solution: null };
    const withLanguage = (language: string) => matchStateSchema.safeParse({ ...base, rounds: Array.from({ length: 3 }, (_, i) => ({ ...base.round, id: crypto.randomUUID(), number: i + 1, endReason: null, selectedLine: null, question: null, solution: null })), language });
    expect(withLanguage("javascript").success).toBe(true);
    expect(withLanguage("java").success).toBe(true);
    expect(withLanguage("ruby").success).toBe(false);
  });
});
