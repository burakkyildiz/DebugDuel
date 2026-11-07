import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { guestSubject, GUEST_COOKIE, subjectHash } from "@/lib/security/guest-token";
import { failure, json, mutationBody } from "@/lib/security/http";
import { emptyPracticeBody, practiceAnswerBody, practiceStateSchema, uuid } from "@/features/practice/contracts";
import { copy } from "@/content/copy.en";
import { observed } from "@/lib/security/telemetry";

type Action = "create" | "get" | "answer" | "reveal";
export function practiceSecrets() {
  const guest = process.env.GUEST_SESSION_SECRET;
  const rate = process.env.RATE_LIMIT_HASH_SECRET;
  return guest && rate && guest.length >= 32 && rate.length >= 32 && !guest.includes("placeholder") && !rate.includes("placeholder") ? { guest, rate } : null;
}
function errorResponse(code: string, action?: Action) {
  const errors = copy.practice.errors;
  const known = Object.hasOwn(errors, code) ? code as keyof typeof errors : "PRACTICE_UNAVAILABLE";
  const status = { SESSION_UNAVAILABLE: 404, AUTH_REQUIRED: 401, INVALID_REQUEST: 400, INVALID_LINE: 422, ROUND_CLOSED: 409, ROUND_NOT_STARTED: 409, ROUND_NOT_ENDED: 409, ALREADY_SUBMITTED: 409, IDEMPOTENCY_CONFLICT: 409, RATE_LIMITED: 429, PRACTICE_UNAVAILABLE: 503 }[known];
  const response = failure(known, status, errors[known]);
  if (status === 429) response.headers.set("Retry-After", action === "create" ? "3600" : "60");
  return response;
}

export async function practiceRequest(request: Request, action: Action, sessionId?: string) {
  return observed(`practice.${action}`, () => executePracticeRequest(request, action, sessionId));
}
async function executePracticeRequest(request: Request, action: Action, sessionId?: string) {
  let selectedLine: number | null = null;
  let key: string | null = null;
  if (action !== "get") {
    try {
      const body = await mutationBody(request);
      if (action === "answer") selectedLine = practiceAnswerBody.parse(body).selectedLine;
      else emptyPracticeBody.parse(body);
      key = uuid.parse(request.headers.get("idempotency-key"));
    } catch { return errorResponse("INVALID_REQUEST"); }
  }
  if (action !== "create" && !uuid.safeParse(sessionId).success) return errorResponse("SESSION_UNAVAILABLE");
  try {
    const client = await createClient();
    if (!client) return errorResponse("PRACTICE_UNAVAILABLE");
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError && authError.name !== "AuthSessionMissingError" && authError.status !== 401 && authError.status !== 403) return errorResponse("PRACTICE_UNAVAILABLE");
    let result;
    if (auth.user) {
      if (!auth.user.email_confirmed_at) return errorResponse("AUTH_REQUIRED");
      result = await client.rpc("practice_account", { p_action: action, p_session_id: sessionId, p_selected_line: selectedLine ?? undefined, p_key: key ?? undefined });
    } else {
      const secrets = practiceSecrets();
      const privileged = createPrivilegedClient();
      if (!secrets || !privileged) return errorResponse("PRACTICE_UNAVAILABLE");
      const subject = guestSubject((await cookies()).get(GUEST_COOKIE)?.value, secrets.guest);
      if (!subject) return errorResponse("SESSION_UNAVAILABLE");
      // Vercel overwrites this platform header. Other deployments share a
      // conservative bucket; arbitrary client forwarding headers are ignored.
      const ip = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : null;
      const ipHash = subjectHash(`practice-ip:${ip || "unverified-network"}`, secrets.rate);
      result = await privileged.rpc("practice_guest", { p_action: action, p_guest_hash: subject, p_ip_hash: ipHash, p_session_id: sessionId, p_selected_line: selectedLine ?? undefined, p_key: key ?? undefined });
    }
    if (result.error) return errorResponse(result.error.message, action);
    const state = practiceStateSchema.safeParse(result.data);
    if (!state.success) return errorResponse("PRACTICE_UNAVAILABLE");
    return json(state.data);
  } catch { return errorResponse("PRACTICE_UNAVAILABLE"); }
}
