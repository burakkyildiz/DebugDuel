import { z } from "zod";
export const matchIdSchema = z.uuid();
export const inviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const inviteCookieSchema = z.object({ token: inviteTokenSchema, expiresAt: z.number() }).strict();
export const matchEmptyBody = z.object({}).strict();
export const readyBody = z.object({ ready: z.boolean() }).strict();
export const answerBody = z.object({ roundId: z.uuid(), selectedLine: z.number().int().min(1).max(1000) }).strict();
const time = z.iso.datetime({ offset: true });
export const matchStateSchema = z.object({
  matchId: z.uuid(), stateVersion: z.number().int().nonnegative(), status: z.enum(["waiting", "countdown", "playing", "between_rounds", "finished", "cancelled", "expired", "aborted"]),
  serverNow: time, lobbyExpiresAt: time, stage: z.literal("single_round_preview"), host: z.boolean(),
  outcome: z.enum(["win", "draw", "forfeit"]).nullable(), winnerId: z.uuid().nullable(), endedReason: z.string().nullable(),
  players: z.array(z.object({ id: z.uuid(), username: z.string(), slot: z.number().int(), ready: z.boolean(), lastSeenAt: time, score: z.number().int().nonnegative(), hasSubmitted: z.boolean() }).strict()),
  round: z.object({ id: z.uuid(), number: z.literal(1), status: z.enum(["pending", "active", "resolved"]), startsAt: time.nullable(), endsAt: time.nullable(), winnerId: z.uuid().nullable(), points: z.number().int() }).strict(),
  self: z.object({ id: z.uuid(), selectedLine: z.number().int().nullable() }).strict(),
  question: z.object({ title: z.string(), prompt: z.string(), code: z.string(), lineCount: z.number().int(), language: z.literal("python") }).strict().nullable(),
  solution: z.object({ correctLine: z.number().int(), explanation: z.string(), answers: z.array(z.object({ userId: z.uuid(), selectedLine: z.number().int(), isCorrect: z.boolean(), points: z.number().int() }).strict()) }).strict().nullable(),
}).strict();
export type MatchState = z.infer<typeof matchStateSchema>;
export const matchReceiptSchema = z.object({ matchId: z.uuid(), inviteCiphertext: z.string().optional(), inviteResponseExpired: z.boolean().optional() }).strict();
