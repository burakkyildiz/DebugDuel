import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { copy } from "@/content/copy.en";

export function AuthCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="auth-section"><div><div className="auth-card"><Brand compact /><h1>{title}</h1><p className="auth-description">{description}</p>{children}</div><Link href="/" className="back-link"><ArrowLeft size={14} aria-hidden="true" />{copy.common.back}</Link></div></section>;
}
