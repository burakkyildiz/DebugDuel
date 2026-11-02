"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Mail, Send } from "lucide-react";
import { copy } from "@/content/copy.en";

type Mode = "login" | "signup" | "forgot" | "reset";
export function AuthForm({ mode, next = "/profile" }: { mode: Mode; next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const text = copy.auth;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(""); setPending(true);
    const form = new FormData(event.currentTarget);
    const body = mode === "forgot" ? { email: form.get("email") } : mode === "reset" ? { password: form.get("password") } : mode === "login" ? { email: form.get("email"), password: form.get("password"), next } : { email: form.get("email"), password: form.get("password") };
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? text.genericFailure); return; }
      if (data.redirect) { window.location.assign(data.redirect); return; }
      setConfirmed(true);
    } catch { setError(text.genericFailure); }
    finally { setPending(false); }
  }

  if (confirmed) return <div role="status"><Send size={30} className="status-icon" aria-hidden="true" /><h1>{text.confirmation}</h1><p className="auth-description">{text.confirmationBody}</p><Link className="text-link" href="/login">{text.backToLogin}</Link></div>;
  return <>
    <form onSubmit={submit} className="form-stack">
      {mode !== "reset" ? <label className="field">{text.emailLabel}<input type="email" name="email" autoComplete="email" required maxLength={254} placeholder={text.emailPlaceholder} disabled={pending} /></label> : null}
      {mode !== "forgot" ? <label className="field">{text.passwordLabel}<input type="password" name="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 1 : 12} maxLength={128} disabled={pending} aria-describedby={mode === "login" ? undefined : "password-hint"} />{mode !== "login" ? <small id="password-hint">{text.passwordHint}</small> : null}</label> : null}
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      <button className="button button-primary button-wide" type="submit" disabled={pending}>{pending ? copy.common.pending : mode === "login" ? text.signIn : mode === "signup" ? text.signUp : mode === "forgot" ? text.sendReset : text.resetButton}{mode === "forgot" ? <Mail size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}</button>
    </form>
    <div className="auth-extra">{mode === "login" ? <><Link href="/forgot-password" className="text-link">{text.forgot}</Link><span>{text.noAccount} <Link href="/signup" className="text-link">{text.signUp}</Link></span></> : <Link href="/login" className="text-link">{text.backToLogin}</Link>}</div>
  </>;
}
