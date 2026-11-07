import Link from "next/link";
import { Bug, Trophy } from "lucide-react";
import { PageHeading } from "@/components/ui/shell";
import { createClient } from "@/lib/supabase/server";
import { readLeaderboard } from "@/lib/progression/server";
import { copy } from "@/content/copy.en";
import { PublicReadLimited } from "@/lib/security/public-read";

export const metadata = { title: "Leaderboard" };

export default async function Leaderboard({ searchParams }: {
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const { cursor } = await searchParams;
  const supabase = await createClient();
  let limited = false;
  const result = supabase ? await readLeaderboard(supabase, cursor).catch(error => { limited = error instanceof PublicReadLimited; return null; }) : null;
  const text = copy.leaderboard;
  return <section className="container page-container">
    <PageHeading eyebrow={text.eyebrow} title={text.title} body={text.body} />
    <div className="leaderboard-shell">
      <div className="leaderboard-heading"><Trophy size={18} className="syntax-amber" aria-hidden="true" />{text.xp}</div>
      {!result ? <div className="empty-state"><p role="alert">{limited ? copy.auth.rateLimit : text.error}</p></div>
        : result.items.length === 0 ? <div className="empty-state">
          <span className="icon-box amber"><Trophy size={24} aria-hidden="true" /></span><h2>{text.emptyTitle}</h2><p>{text.emptyBody}</p>
        </div>
        : <div className="table-scroll"><table>
          <thead><tr>{text.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
          <tbody>{result.items.map(player => <tr key={player.username}>
            <td>{String(player.rank).padStart(2, "0")}</td>
            <td><span className="leaderboard-player">
              <span className={"avatar-chip avatar-" + player.avatar_seed}><Bug size={16} aria-hidden="true" /></span>
              {player.username}
            </span></td>
            <td>{player.xp}</td><td>{player.wins} / {player.losses} / {player.draws}</td>
          </tr>)}</tbody>
        </table></div>}
    </div>
    <div className="profile-links">
      {cursor && <Link href="/leaderboard" className="text-link">{copy.pagination.first}</Link>}
      {result?.nextCursor && <Link href={{ pathname: "/leaderboard", query: { cursor: result.nextCursor } }} className="text-link">{copy.pagination.next}</Link>}
    </div>
    <p className="table-note">{text.note}</p>
  </section>;
}
