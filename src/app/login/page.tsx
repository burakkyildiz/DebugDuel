import Link from "next/link";
import { Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { ProviderButton } from "@/components/auth/provider-button";
import { currentUser } from "@/lib/auth";
import { safeRedirect } from "@/lib/security/redirect";
import { copy } from "@/content/copy.en";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; updated?: string }> }) {
  const params = await searchParams;
  const next = safeRedirect(params.next);
  if (await currentUser()) redirect(next === "/reset-password" ? "/profile" : next);
  return <AuthCard title={copy.auth.title} description={copy.auth.description}>
    {params.error ? <p role="alert" className="form-error">{copy.auth.callbackFailure}</p> : null}
    {params.updated ? <p role="status" className="notice success">{copy.auth.verified}</p> : null}
    <div className="auth-options"><ProviderButton next={next} /><Link className="button button-secondary button-wide" href={`/login/email?next=${encodeURIComponent(next)}`}><Mail size={17} aria-hidden="true" />{copy.auth.email}</Link></div><div className="divider">{copy.auth.or}</div><Link href="/practice" className="guest-action">{copy.auth.guest}</Link><p className="guest-hint">{copy.auth.guestHint}</p>
  </AuthCard>;
}
