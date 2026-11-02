import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { currentUser } from "@/lib/auth";
import { safeRedirect } from "@/lib/security/redirect";
import { copy } from "@/content/copy.en";

export default async function EmailLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeRedirect((await searchParams).next);
  if (await currentUser()) redirect(next === "/reset-password" ? "/profile" : next);
  return <AuthCard title={copy.auth.title} description={copy.auth.description}><AuthForm mode="login" next={next} /></AuthCard>;
}
