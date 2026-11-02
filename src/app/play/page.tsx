import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";
import { PageHeading } from "@/components/ui/shell";
import { currentUser } from "@/lib/auth";
import { copy } from "@/content/copy.en";

export const metadata = { title: "Play with Friend" };
export default async function Play() {
  const user = await currentUser();
  return <section className="container page-container"><PageHeading eyebrow={copy.friend.eyebrow} title={copy.friend.title} body={copy.friend.body} /><div className="empty-state"><span className="icon-box violet"><Users size={24} aria-hidden="true" /></span><p>{copy.friend.waiting}</p><Link href={user ? "/profile" : "/login?next=/play"} className="button button-primary">{user ? copy.friend.action : copy.auth.signIn}<ArrowUpRight size={16} aria-hidden="true" /></Link></div></section>;
}
