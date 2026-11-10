"use client";

import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy.en";

type Turnstile = {
  ready: (callback: () => void) => void;
  render: (element: HTMLElement, options: { sitekey: string; theme: "dark"; size: "flexible"; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void; "timeout-callback": () => void; "response-field": false }) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }
let loading: Promise<Turnstile> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    // Turnstile rejects ready() when its script is marked async or defer.
    script.async = false;
    // Preserve the existing nonce/strict-dynamic policy, including descendants.
    script.nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
    const timer = window.setTimeout(() => fail(), 15000);
    const fail = () => { window.clearTimeout(timer); script.remove(); loading = undefined; reject(new Error("Verification unavailable")); };
    script.onerror = fail;
    script.onload = () => {
      const api = window.turnstile;
      if (!api) { fail(); return; }
      api.ready(() => { window.clearTimeout(timer); resolve(api); });
    };
    document.head.appendChild(script);
  });
  return loading;
}

export function TurnstileChallenge({ onToken }: { onToken: (token: string | null) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    let widget: string | undefined;
    let api: Turnstile | undefined;
    const fail = () => { if (!disposed) { onToken(null); setFailed(true); } };
    void loadTurnstile().then(value => {
      if (disposed || !container.current) return;
      api = value;
      widget = api.render(container.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!, theme: "dark", size: "flexible", "response-field": false,
        callback: token => { if (!disposed) { setFailed(false); onToken(token); } },
        "expired-callback": () => { if (!disposed) onToken(null); }, "error-callback": fail, "timeout-callback": fail,
      });
      setReady(true);
    }).catch(fail);
    return () => { disposed = true; if (widget !== undefined) api?.remove(widget); };
  }, [onToken, attempt]);
  return <div>
    <div ref={container} />
    {!ready && !failed && <p role="status" className="muted">{copy.auth.captchaLoading}</p>}
    {failed && <div><p role="alert" className="form-error">{copy.auth.captchaUnavailable}</p><button type="button" className="button button-secondary" onClick={() => { onToken(null); setFailed(false); setReady(false); setAttempt(value => value + 1); }}>{copy.auth.captchaRetry}</button></div>}
  </div>;
}
