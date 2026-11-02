import { z } from "zod";

export const emptyPracticeBody = z.object({}).strict();
export const practiceAnswerBody = z.object({ selectedLine: z.number().int().min(1).max(1000) }).strict();
export const uuid = z.uuid();
export const practiceStateSchema = z.object({
  sessionId: uuid,
  serverNow: z.iso.datetime({ offset: true }),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  identity: z.enum(["guest", "account"]),
  status: z.enum(["active", "resolved"]),
  question: z.object({ title: z.string(), prompt: z.string(), code: z.string(), lineCount: z.number().int().positive(), language: z.literal("python") }).strict(),
  selectedLine: z.number().int().positive().nullable(),
  solution: z.object({ correctLine: z.number().int().positive(), explanation: z.string(), correctedCode: z.string(), isCorrect: z.boolean().nullable() }).strict().nullable(),
}).strict().refine(s => (s.status === "resolved") === (s.solution !== null));
export type PracticeState = z.infer<typeof practiceStateSchema>;
