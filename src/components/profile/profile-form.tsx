"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bug, Check } from "lucide-react";
import { copy } from "@/content/copy.en";
import type { Tables } from "@/types/database.generated";

export function ProfileForm({ profile }: { profile: Tables<"profiles"> }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const text = copy.profile;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError(""); setSaved(false);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/me/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), displayName: form.get("displayName"), avatarSeed: form.get("avatarSeed") }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? text.unavailable); return; }
      setSaved(true); router.refresh();
    } catch { setError(text.unavailable); }
    finally { setPending(false); }
  }
  return <form className="form-stack" onSubmit={submit}>
    <label className="field"><span id="username-label">{text.username}</span><input name="username" aria-labelledby="username-label" required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]{3,20}" defaultValue={profile.username ?? ""} autoComplete="username" disabled={pending} aria-describedby="username-hint" /><small id="username-hint">{text.usernameHint}</small></label>
    <label className="field">{text.displayName}<input name="displayName" required maxLength={40} defaultValue={profile.display_name} autoComplete="nickname" disabled={pending} /></label>
    <fieldset disabled={pending} className="field" style={{ border: 0, padding: 0 }}><legend style={{ marginBottom: 12 }}>{text.avatar}</legend><div className="avatar-choices">{["violet", "mint", "amber", "rose"].map(seed => <label className="avatar-option" key={seed}><input type="radio" name="avatarSeed" value={seed} defaultChecked={profile.avatar_seed === seed} aria-label={seed} /><span className={`avatar-chip avatar-${seed}`}><Bug size={24} aria-hidden="true" /></span></label>)}</div></fieldset>
    {error ? <p className="form-error" role="alert">{error}</p> : null}{saved ? <p className="notice success" role="status">{text.saved}</p> : null}
    <button className="button button-primary" type="submit" disabled={pending}>{pending ? copy.common.pending : text.save}<Check size={16} aria-hidden="true" /></button>
  </form>;
}
