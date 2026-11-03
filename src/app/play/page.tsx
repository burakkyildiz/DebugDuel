import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui/shell";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MatchEntry } from "@/features/matches/entry";
import { copy } from "@/content/copy.en";
export const metadata = { title: "Play with Friend" };
export default async function Play() {
  const user = await requireUser("/play");
  const client = await createClient();
  const profile = await client?.from("profiles").select("onboarding_completed_at").eq("id", user.id).maybeSingle();
  if (!profile?.data?.onboarding_completed_at) redirect("/onboarding?next=/play");
  return <section className="container page-container"><PageHeading eyebrow={copy.match.eyebrow} title={copy.match.title} body={copy.match.description} /><MatchEntry userId={user.id} /></section>;
}
