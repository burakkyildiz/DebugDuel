import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { requireUser } from "@/lib/auth";
import { validRecovery } from "@/lib/security/recovery";
import { copy } from "@/content/copy.en";
export default async function ResetPassword() { const user = await requireUser("/reset-password"); if (!await validRecovery(user.id)) redirect("/forgot-password"); return <AuthCard title={copy.auth.resetTitle} description={copy.auth.resetDescription}><AuthForm mode="reset" /></AuthCard>; }
