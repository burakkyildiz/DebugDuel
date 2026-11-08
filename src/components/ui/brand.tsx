import Link from "next/link";
import { copy } from "@/content/copy.en";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label={`${copy.brand} — ${copy.nav.home}`}>
    <span className="brand-mark"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M11 8 4 16l7 8M21 8l7 8-7 8M18.5 6l-5 20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
    <span>DEBUG<span className="brand-light">DUEL</span></span>
    {!compact && <span className="brand-badge">BETA</span>}
  </Link>;
}
