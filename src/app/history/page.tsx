import { History } from "lucide-react";
import { PageHeading } from "@/components/ui/shell";
import { requireUser } from "@/lib/auth";
import { copy } from "@/content/copy.en";

export const metadata = { title: "Match history" };
export default async function MatchHistory() {
  await requireUser("/history");
  return <section className="container page-container"><PageHeading eyebrow={copy.history.eyebrow} title={copy.history.title} body={copy.history.body} /><div className="empty-state"><History size={30} aria-hidden="true" /><h2>{copy.history.emptyTitle}</h2><p>{copy.history.emptyBody}</p></div></section>;
}
