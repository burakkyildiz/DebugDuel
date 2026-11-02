import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { copy } from "@/content/copy.en";
import { safeRedirect } from "@/lib/security/redirect";
export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) { const next = safeRedirect((await searchParams).next); return <AuthCard title={copy.auth.signUpTitle} description={copy.auth.signUpDescription}><AuthForm mode="signup" next={next} /></AuthCard>; }
