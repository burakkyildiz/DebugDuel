import { z } from "zod";
export const matchIdSchema = z.uuid();
export const inviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const inviteCookieSchema = z.object({ token: inviteTokenSchema, expiresAt: z.number() }).strict();
export const matchEmptyBody = z.object({}).strict();
export const readyBody = z.object({ ready: z.boolean() }).strict();
export const answerBody = z.object({ roundId: z.uuid(), selectedLine: z.number().int().min(1).max(1000) }).strict();
const time = z.iso.datetime({ offset: true });
const question = z.object({ title: z.string(), prompt: z.string(), code: z.string(), lineCount: z.number().int().positive(), language: z.literal("python"), difficulty: z.enum(["easy", "medium", "hard"]).optional() }).strict();
const solution = z.object({ correctLine: z.number().int().positive(), explanation: z.string(), correctedCode: z.string().optional(), answers: z.array(z.object({ userId: z.uuid(), selectedLine: z.number().int(), isCorrect: z.boolean(), points: z.number().int().min(0).max(150) }).strict()) }).strict();
const round = z.object({ id: z.uuid(), number: z.number().int().min(1).max(3), status: z.enum(["pending", "active", "resolved"]), startsAt: time.nullable(), endsAt: time.nullable(), winnerId: z.uuid().nullable(), points: z.number().int().min(0).max(150) }).strict();
const historyRound = round.extend({ endReason: z.enum(["correct_answer", "both_incorrect", "timeout", "match_ended"]).nullable(), selectedLine: z.number().int().nullable(), question: question.nullable(), solution: solution.nullable() }).strict();
export const matchStateSchema = z.object({
  matchId: z.uuid(), stateVersion: z.number().int().nonnegative(), status: z.enum(["waiting", "countdown", "playing", "between_rounds", "finished", "cancelled", "expired", "aborted"]),
  serverNow: time, lobbyExpiresAt: time, stage: z.enum(["single_round_preview", "full_match"]), host: z.boolean(),
  roundCount: z.literal(3).optional(), nextPhaseAt: time.nullable().optional(), nextStartsAt: time.nullable().optional(), rounds: z.array(historyRound).length(3).optional(),
  outcome: z.enum(["win", "draw", "forfeit"]).nullable(), winnerId: z.uuid().nullable(), endedReason: z.string().nullable(),
  players: z.array(z.object({ id: z.uuid(), username: z.string(), slot: z.number().int().min(1).max(2), ready: z.boolean(), lastSeenAt: time, score: z.number().int().min(0).max(450), hasSubmitted: z.boolean() }).strict()).min(1).max(2),
  round, self: z.object({ id: z.uuid(), selectedLine: z.number().int().nullable() }).strict(),
  question: question.nullable(), solution: solution.nullable(),
  progress: z.object({
    xpEarned: z.number().int().min(0).max(80),
    totalXp: z.number().int().nonnegative(),
    dailyLimit: z.boolean(),
  }).strict().optional(),
}).strict().superRefine((value, context) => {
  if (value.stage === "full_match" && (!value.rounds || value.roundCount !== 3 || value.nextPhaseAt === undefined)) context.addIssue({ code: "custom", message: "Incomplete three-round state" });
  if (value.progress && (value.status !== "finished" || value.stage !== "full_match" || value.progress.totalXp < value.progress.xpEarned || (value.progress.dailyLimit && value.progress.xpEarned > 0))) {
    context.addIssue({ code: "custom", message: "Invalid match progress" });
  }
  for (const item of [{ ...value.round, question: value.question, solution: value.solution }, ...(value.rounds ?? [])]) {
    if (item.question && (!item.startsAt || Date.parse(item.startsAt) > Date.parse(value.serverNow))) context.addIssue({ code: "custom", message: "Premature question" });
    if (item.solution && (item.status !== "resolved" || !item.question)) context.addIssue({ code: "custom", message: "Premature solution" });
  }
});
export type MatchState = z.infer<typeof matchStateSchema>;
export const matchReceiptSchema = z.object({ matchId: z.uuid(), inviteCiphertext: z.string().optional(), inviteResponseExpired: z.boolean().optional() }).strict();
export const engineHealthSchema = z.object({ ready: z.boolean(), lastSuccessfulTickAt: time.nullable() }).strict();
