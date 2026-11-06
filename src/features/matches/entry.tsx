"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { copy } from "@/content/copy.en";
const text = copy.match;
export function MatchEntry({ joining = false, replay = false, userId }: { joining?: boolean; replay?: boolean; userId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const key = useRef<string | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/matches", { cache: "no-store" }).then(r => r.json()).then(data => { if (!cancelled && data.matchId) setActive(data.matchId); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  async function submit() {
    if (inFlight.current) return;
    inFlight.current = true; setPending(true); setError("");
    key.current ??= crypto.randomUUID();
    try {
      const response = await fetch(joining ? "/api/invites/redeem" : "/api/matches", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key.current }, body: "{}", signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? text.errors.ENGINE_UNAVAILABLE); return; }
      if (result.inviteUrl) { try { sessionStorage.setItem(`dd-invite:${userId}:${result.matchId}`, result.inviteUrl); } catch { /* Sharing can be recovered with a fresh invitation. */ } }
      router.push(`/match/${result.matchId}`);
    } catch { setError(text.errors.ENGINE_UNAVAILABLE); }
    finally { inFlight.current = false; setPending(false); }
  }
  return <div className={replay ? "match-replay" : "profile-panel match-entry"}>
    {!replay && <p className="notice">{text.fullMatch}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {active && <Link className="button button-secondary" href={`/match/${active}`}>{text.resume}</Link>}
    {(!replay || !active) && <button type="button" className="button button-primary" onClick={() => void submit()} disabled={pending}>{pending ? copy.common.pending : error ? text.retry : joining ? text.join : replay ? text.newRoom : text.create}</button>}
  </div>;
}
