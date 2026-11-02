import { describe, expect, it } from "vitest";
import { earnedXp, roundPoints, RULES } from "@/lib/game/rules";

describe("server rule preview contract", () => {
  it.each([[0, 150], [9000, 140], [22500, 125], [44999, 100], [45000, 0], [-1, 0], [Infinity, 0], [NaN, 0]])("scores %s ms as %s", (elapsed, expected) => expect(roundPoints(elapsed)).toBe(expected));
  it("keeps the prescribed match format", () => expect([RULES.rounds, RULES.roundDurationMs, RULES.countdownMs, RULES.explanationMs]).toEqual([3, 45000, 3000, 5000]));
  it.each([["win", 3, 80], ["loss", 1, 30], ["draw", 0, 35], ["forfeit-win", 1, 40], ["forfeit-loss", 2, 0], ["practice", 1, 0], ["aborted", 1, 0]] as const)("awards %s/%i as %i XP", (outcome, roundsWon, expected) => expect(earnedXp({ outcome, roundsWon, hasAttempt: true, eligible: true })).toBe(expected));
  it("awards no XP without an attempt or beyond the daily pair quota", () => {
    expect(earnedXp({ outcome: "win", roundsWon: 3, hasAttempt: false, eligible: true })).toBe(0);
    expect(earnedXp({ outcome: "win", roundsWon: 3, hasAttempt: true, eligible: false })).toBe(0);
  });
});
