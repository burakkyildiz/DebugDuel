import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { ProviderButton } from "@/components/auth/provider-button";
import { copy } from "@/content/copy.en";
import { safeRedirect } from "@/lib/security/redirect";
export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) { const next = safeRedirect((await searchParams).next); return <AuthCard title={copy.auth.signUpTitle} description={copy.auth.signUpDescription}><div className="auth-options"><ProviderButton next={next} /></div><div className="divider">{copy.auth.orEmail}</div><AuthForm mode="signup" next={next} /></AuthCard>; }
