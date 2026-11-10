import { z } from "zod";

const email = z.email().max(254);
const password = z.string().min(12).max(128);
const captchaToken = z.string().trim().min(1).max(2048).optional();
export const loginSchema = z.object({ email, password: z.string().min(1).max(128), next: z.string().optional(), captchaToken }).strict();
export const signupSchema = z.object({ email, password, next: z.string().optional(), captchaToken }).strict();
export const forgotSchema = z.object({ email, captchaToken }).strict();
export const resetSchema = z.object({ password }).strict();
export const oauthSchema = z.object({ next: z.string().optional() }).strict();
export const profileSchema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/),
  displayName: z.string().trim().min(1).max(40),
  avatarSeed: z.enum(["violet", "mint", "amber", "rose", "cyan", "lime", "blue", "coral"]),
}).strict();
