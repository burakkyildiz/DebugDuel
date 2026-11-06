import Link from "next/link";
import { History } from "lucide-react";
import { PageHeading } from "@/components/ui/shell";
import { requireUser } from "@/lib/auth";
import { readHistory } from "@/lib/progression/server";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/content/copy.en";

export const metadata = { title: "Match history" };
const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

export default async function MatchHistory({ searchParams }: {
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  await requireUser("/history");
  const { cursor } = await searchParams;
  const client = await createClient();
  const result = client ? await readHistory(client, cursor).catch(() => null) : null;
  const text = copy.history;
  return <section className="container page-container">
    <PageHeading eyebrow={text.eyebrow} title={text.title} body={text.body} />
    {!result ? <p className="form-error" role="alert">{text.error}</p>
      : result.items.length === 0 ? <div className="empty-state">
        <History size={30} aria-hidden="true" /><h2>{text.emptyTitle}</h2><p>{text.emptyBody}</p>
      </div>
      : <div className="leaderboard-shell table-scroll"><table>
        <thead><tr>{text.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{result.items.map(match => {
          const outcome = match.status === "finished" ? match.own_result : match.status;
          const label = text.outcomes[outcome as keyof typeof text.outcomes] ?? text.outcomes.cancelled;
          return <tr key={match.match_id}>
            <td>{match.rival ? "@" + match.rival : text.noRival}</td>
            <td><time dateTime={match.created_at}>{date.format(new Date(match.created_at))}</time></td>
            <td>{label}{match.outcome === "forfeit" ? " · " + text.forfeit : ""}</td>
            <td>{match.rival_score == null ? "—" : match.own_score + " – " + match.rival_score}</td>
            <td>{match.xp_earned}</td>
            <td><Link className="text-link" href={"/match/" + match.match_id + "/results"}>{text.details}</Link></td>
          </tr>;
        })}</tbody>
      </table></div>}
    <div className="profile-links">
      {cursor && <Link href="/history" className="text-link">{copy.pagination.first}</Link>}
      {result?.nextCursor && <Link href={{ pathname: "/history", query: { cursor: result.nextCursor } }} className="text-link">{copy.pagination.next}</Link>}
    </div>
  </section>;
}
