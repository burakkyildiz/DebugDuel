// Preview/test helpers only. Persisted match decisions belong to the PostgreSQL engine.
export const RULES = { rounds: 3, roundDurationMs: 45_000, countdownMs: 3_000, explanationMs: 5_000, dailyPairLimit: 5 } as const;

export function roundPoints(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs >= RULES.roundDurationMs) return 0;
  return 100 + Math.floor(50 * (RULES.roundDurationMs - Math.floor(elapsedMs)) / RULES.roundDurationMs);
}

type Reward = { outcome: "win" | "loss" | "draw" | "forfeit-win" | "forfeit-loss" | "aborted" | "practice"; roundsWon: number; hasAttempt: boolean; eligible: boolean; };
export function earnedXp({ outcome, roundsWon, hasAttempt, eligible }: Reward): number {
  if (!eligible || !hasAttempt || !Number.isInteger(roundsWon) || roundsWon < 0 || roundsWon > 3) return 0;
  if (outcome === "aborted" || outcome === "practice" || outcome === "forfeit-loss") return 0;
  if (outcome === "forfeit-win") return 30 + 10 * roundsWon;
  return 20 + 10 * roundsWon + (outcome === "win" ? 30 : outcome === "draw" ? 15 : 0);
}
