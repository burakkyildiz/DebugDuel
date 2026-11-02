"use client";

import { useState } from "react";
import { copy } from "@/content/copy.en";

export function ProviderButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function login() {
    if (pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/github", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ next }) });
      const data = await response.json();
      if (!response.ok || !data.providerUrl) { setError(data.error?.code === "PROVIDER_NOT_ENABLED" ? copy.auth.providerDisabled : copy.auth.providerFailure); return; }
      window.location.assign(data.providerUrl);
    } catch { setError(copy.auth.providerFailure); }
    finally { setPending(false); }
  }
  return <><button type="button" className="button github-button button-wide" onClick={login} disabled={pending}><svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.58 9.58 0 0 1 12 6.83c.85 0 1.71.11 2.51.34 1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.58 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>{pending ? copy.common.pending : copy.auth.github}</button>{error ? <p role="alert" className="form-error">{error}</p> : null}</>;
}
