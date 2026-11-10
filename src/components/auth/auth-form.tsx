"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Mail, Send } from "lucide-react";
import { copy } from "@/content/copy.en";
import { TurnstileChallenge } from "./turnstile";

type Mode = "login" | "signup" | "forgot" | "reset";
export function AuthForm({ mode, next = "/profile" }: { mode: Mode; next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resent, setResent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const needsCaptcha = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) && mode !== "reset";
  const text = copy.auth;
  const challenge = needsCaptcha ? <TurnstileChallenge key={captchaAttempt} onToken={setCaptchaToken} /> : null;
  const blocked = pending || (needsCaptcha && !captchaToken);
  function resetCaptcha() { setCaptchaToken(null); setCaptchaAttempt(value => value + 1); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    setError(""); setPending(true);
    const form = new FormData(event.currentTarget);
    const body = mode === "forgot" ? { email: form.get("email") } : mode === "reset" ? { password: form.get("password") } : { email: form.get("email"), password: form.get("password"), next };
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, ...(needsCaptcha ? { captchaToken } : {}) }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? text.genericFailure); return; }
      if (data.redirect) { window.location.assign(data.redirect); return; }
      setSubmittedEmail(String(form.get("email") ?? "")); setConfirmed(true);
    } catch { setError(text.genericFailure); }
    finally { resetCaptcha(); setPending(false); }
  }

  async function resend() {
    if (blocked) return;
    setPending(true); setError(""); setResent(false);
    try {
      const response = await fetch("/api/auth/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: submittedEmail, next, ...(needsCaptcha ? { captchaToken } : {}) }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? text.genericFailure); return; }
      setResent(true);
    } catch { setError(text.genericFailure); }
    finally { resetCaptcha(); setPending(false); }
  }

  if (confirmed) return <div><div role="status"><Send size={30} className="status-icon" aria-hidden="true" /><h2>{text.confirmation}</h2><p className="auth-description">{text.confirmationBody}</p></div>{mode === "signup" ? <>{challenge}<button type="button" className="button button-secondary button-wide" onClick={resend} disabled={blocked}>{pending ? copy.common.pending : text.resend}</button></> : null}{error ? <p role="alert" className="form-error">{error}</p> : null}{resent ? <p role="status" className="notice">{text.confirmationBody}</p> : null}<div className="auth-extra"><Link className="text-link" href={`/login?next=${encodeURIComponent(next)}`}>{text.backToLogin}</Link></div></div>;
  return <>
    <form onSubmit={submit} className="form-stack">
      {mode !== "reset" ? <label className="field">{text.emailLabel}<input type="email" name="email" autoComplete="email" required maxLength={254} placeholder={text.emailPlaceholder} disabled={pending} /></label> : null}
      {mode !== "forgot" ? <label className="field"><span id="password-label">{text.passwordLabel}</span><input type="password" name="password" aria-labelledby="password-label" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 1 : 12} maxLength={128} disabled={pending} aria-describedby={mode === "login" ? undefined : "password-hint"} />{mode !== "login" ? <small id="password-hint">{text.passwordHint}</small> : null}</label> : null}
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      {challenge}
      <button className="button button-primary button-wide" type="submit" disabled={blocked}>{pending ? copy.common.pending : mode === "login" ? text.signIn : mode === "signup" ? text.signUp : mode === "forgot" ? text.sendReset : text.resetButton}{mode === "forgot" ? <Mail size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}</button>
    </form>
    <div className="auth-extra">{mode === "login" ? <><Link href="/forgot-password" className="text-link">{text.forgot}</Link><span>{text.noAccount} <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-link">{text.signUp}</Link></span></> : <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-link">{text.backToLogin}</Link>}</div>
  </>;
}
