import { describe, expect, it } from "vitest";
import { matchStateSchema } from "@/features/matches/contracts";
const now = "2026-11-03T09:00:00Z";
const starts = "2026-11-03T08:59:50Z";
const id = () => crypto.randomUUID();
function fixture() {
  const actor = id(); const roundIds = [id(), id(), id()];
  const round = { id: roundIds[0], number: 1, status: "active", startsAt: starts, endsAt: "2026-11-03T09:00:35Z", winnerId: null, points: 0 };
  const question = { title: "Question", prompt: "Find the fault", code: "line", lineCount: 1, language: "python", difficulty: "easy" };
  return { matchId: id(), stateVersion: 3, status: "playing", serverNow: now, lobbyExpiresAt: "2026-11-03T09:10:00Z", stage: "full_match", host: true, roundCount: 3,
    nextPhaseAt: round.endsAt, nextStartsAt: null, outcome: null, winnerId: null, endedReason: null,
    players: [{ id: actor, username: "Player", slot: 1, ready: true, lastSeenAt: now, score: 0, hasSubmitted: false }], round,
    self: { id: actor, selectedLine: null }, question, solution: null,
    rounds: [1, 2, 3].map((number, index) => ({ ...round, id: roundIds[index], number, status: number === 1 ? "active" : "pending", startsAt: number === 1 ? starts : null, endsAt: number === 1 ? round.endsAt : null, endReason: null, selectedLine: null, question: number === 1 ? question : null, solution: null })),
  };
}
describe("three-round disclosure contract", () => {
  it("accepts only a complete safe three-round snapshot", () => {
    const state = fixture(); expect(matchStateSchema.safeParse(state).success).toBe(true);
    expect(matchStateSchema.safeParse({ ...state, rounds: undefined }).success).toBe(false);
    expect(matchStateSchema.safeParse({ ...state, rounds: state.rounds.slice(0, 2) }).success).toBe(false);
    expect(matchStateSchema.safeParse({ ...state, serviceKey: "forged" }).success).toBe(false);
  });
  it("rejects current and future questions before the shared start", () => {
    const state = fixture();
    expect(matchStateSchema.safeParse({ ...state, round: { ...state.round, startsAt: "2026-11-03T09:00:01Z" } }).success).toBe(false);
    state.rounds[1].question = state.question;
    expect(matchStateSchema.safeParse(state).success).toBe(false);
  });
  it("rejects solution data on an active round and hidden solution fields", () => {
    const state = fixture(); const solution = { correctLine: 1, explanation: "Fix", correctedCode: "fixed", answers: [] };
    expect(matchStateSchema.safeParse({ ...state, solution }).success).toBe(false);
    expect(matchStateSchema.safeParse({ ...state, round: { ...state.round, status: "resolved" }, solution }).success).toBe(true);
    expect(matchStateSchema.safeParse({ ...state, round: { ...state.round, status: "resolved" }, solution: { ...solution, futureQuestionId: id() } }).success).toBe(false);
  });
  it("bounds rounds, total score and per-round points", () => {
    const state = fixture();
    expect(matchStateSchema.safeParse({ ...state, round: { ...state.round, number: 4 } }).success).toBe(false);
    expect(matchStateSchema.safeParse({ ...state, round: { ...state.round, points: 151 } }).success).toBe(false);
    expect(matchStateSchema.safeParse({ ...state, players: [{ ...state.players[0], score: 451 }] }).success).toBe(false);
  });
});
