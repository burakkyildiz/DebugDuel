import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { matchIdSchema, matchStateSchema } from "@/features/matches/contracts";
import { MatchRoom } from "@/features/matches/room";
export const metadata = { title: "Private Match" };
export default async function Match({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  if (!matchIdSchema.safeParse(matchId).success) notFound();
  await requireUser(`/match/${matchId}`);
  const client = await createClient();
  const response = await client?.rpc("match_command", { p_action: "get", p_match: matchId });
  const state = matchStateSchema.safeParse(response?.data);
  if (response?.error || !state.success) notFound();
  return <section className="container page-container"><MatchRoom key={state.data.matchId} initial={state.data} /></section>;
}
