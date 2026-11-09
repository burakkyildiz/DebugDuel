"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bug, Check } from "lucide-react";
import { copy } from "@/content/copy.en";
import type { Tables } from "@/types/database.generated";

export function ProfileForm({ profile, next, email }: { profile: Tables<"profiles">; next?: string; email?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const text = copy.profile;
  const avatarChoices = [{ seed: "blue", color: "Navy" }, { seed: "rose", color: "Red" }, { seed: "coral", color: "Orange" }, { seed: "amber", color: "Gold" }, { seed: "cyan", color: "Cream" }];
  const currentAvatar = ({ violet: "blue", mint: "blue", lime: "cyan" } as Record<string, string>)[profile.avatar_seed] ?? profile.avatar_seed;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError(""); setSaved(false);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/me/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), displayName: form.get("username"), avatarSeed: form.get("avatarSeed") }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? text.unavailable); return; }
      setSaved(true);
      if (next) router.push(next); else router.refresh();
    } catch { setError(text.unavailable); }
    finally { setPending(false); }
  }
  if (profile.onboarding_completed_at) return <div className="profile-identity-grid">{email && <div className="profile-identity-item"><span>{copy.auth.emailLabel}</span><strong>{email}</strong></div>}<div className="profile-identity-item"><span>{text.username}</span><strong>@{profile.username}</strong></div><div className="profile-identity-item"><span className="sr-only">{text.avatar}</span><span className={`avatar-chip avatar-${profile.avatar_seed}`} role="img" aria-label={avatarChoices.find(choice => choice.seed === currentAvatar)?.color ?? currentAvatar}><Bug size={24} aria-hidden="true" /></span></div></div>;
  return <form className="form-stack" onSubmit={submit}>
    {email && <div className="profile-email"><span>{copy.auth.emailLabel}</span><p>{email}</p></div>}
    <label className="field"><span id="username-label">{text.username}</span><input name="username" aria-labelledby="username-label" required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]{3,20}" defaultValue={profile.username ?? ""} autoComplete="username" disabled={pending} aria-describedby="username-hint" /><small id="username-hint">{text.usernameHint}</small></label>
    <fieldset disabled={pending} className="field" style={{ border: 0, padding: 0 }}><legend style={{ marginBottom: 12 }}>{text.avatar}</legend><div className="avatar-choices">{avatarChoices.map(({ seed, color }) => <label className="avatar-option" key={seed}><input type="radio" name="avatarSeed" value={seed} defaultChecked={Boolean(profile.username) && currentAvatar === seed} required aria-label={color} /><span className={`avatar-chip avatar-${seed}`}><Bug size={24} aria-hidden="true" /></span></label>)}</div></fieldset>
    <label className="profile-confirm"><input type="checkbox" required disabled={pending} /> <span>{text.confirmLock}</span></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}{saved ? <p className="notice success" role="status">{text.saved}</p> : null}
    <button className="button button-primary" type="submit" disabled={pending}>{pending ? copy.common.pending : text.save}<Check size={16} aria-hidden="true" /></button>
  </form>;
}
