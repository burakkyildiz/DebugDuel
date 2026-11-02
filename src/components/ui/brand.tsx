import Link from "next/link";
import { Bug } from "lucide-react";
import { copy } from "@/content/copy.en";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label={`${copy.brand} — ${copy.nav.home}`}>
    <span className="brand-mark"><Bug size={21} strokeWidth={1.8} aria-hidden="true" /></span>
    <span>DEBUG<span className="brand-light"> DUEL</span><span className="brand-dot">.</span></span>
    {!compact && <span className="brand-badge">BETA</span>}
  </Link>;
}
