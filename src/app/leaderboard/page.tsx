import { Trophy } from "lucide-react";
import { PageHeading } from "@/components/ui/shell";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/content/copy.en";

export const metadata = { title: "Leaderboard" };
export default async function Leaderboard() {
  const supabase = await createClient();
  const result = supabase ? await supabase.from("profiles").select("username,avatar_seed,xp,wins,losses,draws").not("onboarding_completed_at", "is", null).gt("matches_played", 0).order("xp", { ascending: false }).order("wins", { ascending: false }).order("created_at").order("id").limit(25) : null;
  const players = result?.data ?? [];
  const text = copy.leaderboard;
  return <section className="container page-container"><PageHeading eyebrow={text.eyebrow} title={text.title} body={text.body} /><div className="leaderboard-shell"><div className="leaderboard-heading"><Trophy size={18} className="syntax-amber" aria-hidden="true" />{text.xp}</div>{result?.error || !result ? <div className="empty-state"><p role="alert">{text.error}</p></div> : players.length === 0 ? <div className="empty-state"><span className="icon-box amber"><Trophy size={24} aria-hidden="true" /></span><h2>{text.emptyTitle}</h2><p>{text.emptyBody}</p></div> : <div className="table-scroll"><table><thead><tr>{text.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{players.map((player,index) => <tr key={player.username}><td>{String(index + 1).padStart(2,"0")}</td><td>{player.username}</td><td>{player.xp}</td><td>{player.wins} / {player.losses} / {player.draws}</td></tr>)}</tbody></table></div>}</div><p className="table-note">{text.note}</p></section>;
}
