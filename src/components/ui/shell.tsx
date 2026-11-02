import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { currentUser } from "@/lib/auth";
import { copy } from "@/content/copy.en";

export async function Header() {
  const user = await currentUser();
  return <header className="site-header"><div className="container header-inner">
    <Brand />
    <nav aria-label="Main navigation" className="header-nav">
      <Link href="/practice">{copy.nav.practice}</Link>
      <Link href="/leaderboard">{copy.nav.leaderboard}</Link>
      <Link href={user ? "/profile" : "/login"} className="nav-login">{user ? copy.nav.profile : copy.nav.login}<ArrowUpRight size={15} aria-hidden="true" /></Link>
    </nav>
  </div></header>;
}

export function Footer() {
  return <footer className="site-footer"><div className="container footer-inner"><div><Brand compact /><p>{copy.footer.line}</p></div><p>{copy.footer.note}</p><span>{copy.footer.copyright}</span></div></footer>;
}

export function PageHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <div className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{body}</p></div>;
}
