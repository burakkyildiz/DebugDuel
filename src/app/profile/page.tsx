import Link from "next/link";
import { PageHeading } from "@/components/ui/shell";
import { ProfileForm } from "@/components/profile/profile-form";
import { SignOutButton } from "@/components/auth/signout-button";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/security/redirect";
import { requireUser } from "@/lib/auth";
import { copy } from "@/content/copy.en";

export const metadata = { title: "Your profile" };
export default async function Profile({ searchParams }: { searchParams?: Promise<{ next?: string }> }) {
  const destination = safeRedirect((await searchParams)?.next);
  const user = await requireUser("/profile");
  const supabase = await createClient();
  const result = await supabase?.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = result?.data;
  if (!profile || result.error) return <section className="container page-container"><p className="form-error" role="alert">{copy.profile.unavailable}</p><div className="profile-links"><SignOutButton /></div></section>;
  const decided = profile.wins + profile.losses;
  const winRate = decided ? new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 1 }).format(profile.wins / decided) : "—";
  const stats = [[copy.profile.xp, profile.xp], [copy.profile.matches, profile.matches_played], [copy.profile.wins, profile.wins], [copy.profile.losses, profile.losses], [copy.profile.draws, profile.draws], [copy.profile.correct, profile.correct_answers], [copy.profile.winRate, winRate]];
  return <section className="container page-container"><div className="profile-layout"><PageHeading eyebrow={copy.profile.eyebrow} title={profile.username ? `@${profile.username}` : copy.profile.title} body={copy.profile.body} /><div className="stats-grid">{stats.map(([label, value]) => <div className="stat" key={label}><p>{label}</p><strong>{value}</strong></div>)}</div><div className="profile-panel"><ProfileForm profile={profile} next={destination !== "/profile" ? destination : undefined} /></div><div className="profile-links"><Link href="/history" className="text-link">{copy.profile.history}</Link><SignOutButton /></div></div></section>;
}
