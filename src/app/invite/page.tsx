import Link from "next/link";
import { cookies } from "next/headers";
import { PageHeading } from "@/components/ui/shell";
import { currentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inviteNow } from "@/lib/matches/clock";
import { unseal } from "@/lib/security/sealed";
import { inviteCookieSchema } from "@/features/matches/contracts";
import { MatchEntry } from "@/features/matches/entry";
import { INVITE_COOKIE, invitePurpose } from "@/lib/matches/server";
import { copy } from "@/content/copy.en";
export const metadata = { title: "Join Match", referrer: "no-referrer" };
export default async function Invite() {
  let valid = false;
  try {
    const cookie = (await cookies()).get(INVITE_COOKIE)?.value;
    if (cookie) valid = inviteCookieSchema.parse(unseal(cookie, invitePurpose, process.env.GUEST_SESSION_SECRET)).expiresAt > inviteNow();
  } catch { /* Invalid/expired cookie is not an invitation. */ }
  const user = await currentUser();
  const client = user ? await createClient() : null;
  const profile = user ? await client?.from("profiles").select("onboarding_completed_at").eq("id", user.id).maybeSingle() : null;
  const text = copy.match;
  return <section className="container page-container"><PageHeading eyebrow={text.eyebrow} title={text.joinTitle} body={text.joinBody} />
    {!valid ? <p className="notice">{text.noInvite}</p> : !user ? <Link className="button button-primary" href="/login?next=%2Finvite">{copy.auth.signIn}</Link> : !profile?.data?.onboarding_completed_at ? <div className="profile-panel"><p>{text.profileRequired}</p><Link className="button button-primary" href="/onboarding?next=%2Finvite">{text.completeProfile}</Link></div> : <MatchEntry joining userId={user.id} />}
  </section>;
}
