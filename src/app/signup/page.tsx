import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { copy } from "@/content/copy.en";
export default function Signup() { return <AuthCard title={copy.auth.signUpTitle} description={copy.auth.signUpDescription}><AuthForm mode="signup" /></AuthCard>; }
