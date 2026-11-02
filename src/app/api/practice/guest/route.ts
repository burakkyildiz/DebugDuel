import { cookies } from "next/headers";
import { emptyPracticeBody } from "@/features/practice/contracts";
import { failure, json, mutationBody } from "@/lib/security/http";
import { GUEST_COOKIE, GUEST_LIFETIME, guestSubject, signGuest } from "@/lib/security/guest-token";
import { practiceSecrets } from "@/lib/practice/server";
import { copy } from "@/content/copy.en";

export async function POST(request: Request) {
  try { emptyPracticeBody.parse(await mutationBody(request)); } catch { return failure(); }
  const secrets = practiceSecrets();
  if (!secrets) return failure("PRACTICE_UNAVAILABLE", 503, copy.practice.errors.PRACTICE_UNAVAILABLE);
  const store = await cookies();
  const existing = store.get(GUEST_COOKIE)?.value;
  const response = json({ ready: true });
  if (!guestSubject(existing, secrets.guest)) response.cookies.set(GUEST_COOKIE, signGuest(secrets.guest), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: GUEST_LIFETIME,
  });
  return response;
}
