"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/content/copy.en";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error();
      router.replace("/"); router.refresh();
    } catch { setError(copy.auth.genericFailure); setPending(false); }
  }
  return <div><button type="button" className="button button-secondary" disabled={pending} onClick={signOut}>{pending ? copy.common.pending : copy.auth.signOut}</button>{error ? <p role="alert" className="form-error">{error}</p> : null}</div>;
}
