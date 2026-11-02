"use client";
import { useState, useSyncExternalStore } from "react";
import { copy } from "@/content/copy.en";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function SignOutButton() {
  // A server-rendered button must not accept clicks before its handler is ready.
  const hydrated = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error();
      // Auth cookies changed. Start a fresh document and discard cached account UI
      // rather than racing a router navigation against a refresh of /profile.
      window.location.replace(new URL("/", window.location.origin).href);
    } catch { setError(copy.auth.genericFailure); setPending(false); }
  }
  return <div><button type="button" className="button button-secondary" disabled={!hydrated || pending} onClick={signOut}>{pending ? copy.common.pending : copy.auth.signOut}</button>{error ? <p role="alert" className="form-error">{error}</p> : null}</div>;
}
