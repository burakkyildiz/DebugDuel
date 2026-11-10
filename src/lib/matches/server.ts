import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { failure, json, mutationBody } from "@/lib/security/http";
import { seal, unseal } from "@/lib/security/sealed";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { siteOrigin } from "@/lib/env";
import { answerBody, inviteCookieSchema, inviteTokenSchema, matchEmptyBody, matchIdSchema, matchReceiptSchema, matchStateSchema, readyBody } from "@/features/matches/contracts";
import { copy } from "@/content/copy.en";
import { observed } from "@/lib/security/telemetry";
import { authDependencyFailure } from "@/lib/validation/auth-errors";
export const INVITE_COOKIE = "dd_pending_invite";
export const invitePurpose = "debug-duel:pending-invite:v1";
type Action = "create" | "join" | "invite" | "ready" | "heartbeat" | "sync" | "get" | "answer" | "leave" | "active";
export function matchError(code: string) {
  const messages = copy.match.errors;
  const known = Object.hasOwn(messages, code) ? code as keyof typeof messages : "ENGINE_UNAVAILABLE";
  const statuses = { AUTH_REQUIRED: 401, PROFILE_REQUIRED: 409, ROOM_UNAVAILABLE: 404, ROOM_FULL: 409, ALREADY_IN_ACTIVE_MATCH: 409, INVALID_REQUEST: 400, INVALID_LINE: 422, ROUND_CLOSED: 409, ROUND_NOT_STARTED: 409, ALREADY_SUBMITTED: 409, IDEMPOTENCY_CONFLICT: 409, INVITE_RESPONSE_EXPIRED: 410, RATE_LIMITED: 429, ENGINE_UNAVAILABLE: 503 };
  const response = failure(known, statuses[known], messages[known]);
  if (known === "RATE_LIMITED") response.headers.set("Retry-After", "60");
  return response;
}
export async function matchRequest(request: Request, action: Action, matchId?: string) {
  return observed(`match.${action}`, () => executeMatchRequest(request, action, matchId));
}
async function executeMatchRequest(request: Request, action: Action, matchId?: string) {
  let key: string | undefined;
  let body: unknown = {};
  if (!['get', 'active'].includes(action)) {
    try {
      body = await mutationBody(request);
      (action === "ready" ? readyBody : action === "answer" ? answerBody : matchEmptyBody).parse(body);
      if (!["heartbeat", "sync"].includes(action)) key = z.uuid().parse(request.headers.get("idempotency-key"));
    } catch { return matchError("INVALID_REQUEST"); }
  }
  if (matchId && !matchIdSchema.safeParse(matchId).success) return matchError("ROOM_UNAVAILABLE");
  try {
    const client = await createClient();
    if (!client) return matchError("ENGINE_UNAVAILABLE");
    const { data, error } = await client.auth.getUser();
    const dependency = authDependencyFailure(error);
    if (dependency) return matchError(dependency === "rate_limited" ? "RATE_LIMITED" : "ENGINE_UNAVAILABLE");
    if (error || !data.user?.email_confirmed_at) return matchError("AUTH_REQUIRED");
    let hash: string | undefined;
    let ciphertext: string | undefined;
    if (action === "create" || action === "invite") {
      const token = randomBytes(32).toString("base64url");
      hash = createHash("sha256").update(token).digest("hex");
      ciphertext = Buffer.from(seal({ token }, `receipt:${action}:${data.user.id}:${key}`, process.env.COMMAND_RECEIPT_ENCRYPTION_KEY)).toString("base64");
    } else if (action === "join") {
      const capability = (await cookies()).get(INVITE_COOKIE)?.value;
      if (!capability) return matchError("ROOM_UNAVAILABLE");
      const privileged = createPrivilegedClient();
      const secret = process.env.RATE_LIMIT_HASH_SECRET;
      if (!privileged || !secret || secret.length < 32 || secret.includes("placeholder")) return matchError("ENGINE_UNAVAILABLE");
      // Only Vercel's overwritten forwarding header is trusted. Local/other hosts
      // deliberately share a conservative bucket instead of trusting user headers.
      const ip = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : null;
      const subject = createHmac("sha256", secret).update(`match-join-ip:${ip || "unverified-network"}`).digest("hex");
      const admission = await privileged.rpc("match_join_admission", { p_subject: subject });
      if (admission.error) return matchError("ENGINE_UNAVAILABLE");
      if (!admission.data) return matchError("RATE_LIMITED");
      let invite;
      try { invite = inviteCookieSchema.parse(unseal(capability, invitePurpose, process.env.GUEST_SESSION_SECRET)); }
      catch { return matchError("ROOM_UNAVAILABLE"); }
      if (Date.now() >= invite.expiresAt) return matchError("ROOM_UNAVAILABLE");
      hash = createHash("sha256").update(invite.token).digest("hex");
    }
    const ready = action === "ready" ? readyBody.parse(body).ready : undefined;
    const answer = action === "answer" ? answerBody.parse(body) : undefined;
    const result = await client.rpc("match_command", { p_action: action, p_match: matchId, p_key: key, p_ready: ready, p_round: answer?.roundId, p_line: answer?.selectedLine, p_hash: hash, p_cipher: ciphertext });
    if (result.error) return matchError(result.error.message);
    if (result.data && typeof result.data === "object" && !Array.isArray(result.data) && typeof result.data.commandError === "string") return matchError(result.data.commandError);
    if (["create", "join", "invite", "ready", "leave"].includes(action)) {
      const receipt = matchReceiptSchema.parse(result.data);
      if (receipt.inviteResponseExpired) return json({ ...receipt, error: { code: "INVITE_RESPONSE_EXPIRED", message: copy.match.errors.INVITE_RESPONSE_EXPIRED } }, 410);
      let inviteUrl: string | undefined;
      if (receipt.inviteCiphertext) {
        const decoded = z.object({ token: inviteTokenSchema }).strict().parse(unseal(Buffer.from(receipt.inviteCiphertext, "base64").toString(), `receipt:${action}:${data.user.id}:${key}`, process.env.COMMAND_RECEIPT_ENCRYPTION_KEY));
        inviteUrl = `${siteOrigin()}/invite/${decoded.token}`;
      }
      // Keep the short-lived invite cookie for a lost redeem response retry.
      return json({ matchId: receipt.matchId, ...(inviteUrl ? { inviteUrl } : {}) });
    }
    if (action === "active") return json(z.object({ matchId: z.uuid().nullable() }).strict().parse(result.data));
    return json(matchStateSchema.parse(result.data));
  } catch { return matchError("ENGINE_UNAVAILABLE"); }
}
