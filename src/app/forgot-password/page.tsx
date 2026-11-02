import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { copy } from "@/content/copy.en";
export default function ForgotPassword() { return <AuthCard title={copy.auth.forgotTitle} description={copy.auth.forgotDescription}><AuthForm mode="forgot" /></AuthCard>; }
