"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy.en";
import { CodeLines } from "@/components/game/code-lines";
import { createClient } from "@/lib/supabase/browser";
import { matchStateSchema, type MatchState } from "./contracts";
const text = copy.match;
type Command = { action: string; body: object; key?: string };
export function MatchRoom({ initial }: { initial: MatchState }) {
  const [state, setState] = useState(initial);
  const [selected, setSelected] = useState<number | null>(initial.self.selectedLine);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [connection, setConnection] = useState("connecting");
  const [clock, setClock] = useState(0);
  const [left, setLeft] = useState(false);
  const [anchor, setAnchor] = useState({ server: Date.parse(initial.serverNow), local: 0 });
  const latest = useRef(initial.stateVersion);
  const inFlight = useRef(false);
  const backgroundFlight = useRef(false);
  const failed = useRef<Command | null>(null);
  const mounted = useRef(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const matchId = initial.matchId;
  const terminal = ["finished", "expired", "cancelled", "aborted"].includes(state.status);
  const apply = useCallback((value: unknown, before: number) => {
    const data = matchStateSchema.parse(value);
    if (!mounted.current || data.stateVersion < latest.current) return;
    latest.current = data.stateVersion;
    const now = performance.now();
    setAnchor({ server: Date.parse(data.serverNow), local: (before + now) / 2 });
    setClock(now); setState(data);
    if (data.self.selectedLine !== null) setSelected(data.self.selectedLine);
  }, []);
  const refresh = useCallback(async () => {
    const before = performance.now();
    const response = await fetch(`/api/matches/${matchId}/state`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? text.errors.ENGINE_UNAVAILABLE);
    apply(data, before);
  }, [matchId, apply]);
  const command = useCallback(async (request: Command) => {
    const silent = ["heartbeat", "sync"].includes(request.action);
    if (silent ? inFlight.current || backgroundFlight.current : inFlight.current) return;
    // A background heartbeat must never swallow an explicit Ready/Answer click.
    if (silent) backgroundFlight.current = true; else inFlight.current = true;
    if (!silent) { setBusy(true); setError(""); failed.current = request; }
    try {
      const response = await fetch(`/api/matches/${matchId}/${request.action}`, { method: "POST", headers: { "Content-Type": "application/json", ...(request.key ? { "Idempotency-Key": request.key } : {}) }, body: JSON.stringify(request.body), signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok) {
        if (["ROUND_CLOSED", "ALREADY_SUBMITTED"].includes(data.error?.code)) { await refresh(); if (!silent) failed.current = null; return; }
        throw new Error(data.error?.message ?? text.errors.ENGINE_UNAVAILABLE);
      }
      if (data.inviteUrl) { sessionStorage.setItem(`dd-invite:${initial.self.id}:${matchId}`, data.inviteUrl); setInviteUrl(data.inviteUrl); setCopied(false); }
      if (request.action === "leave" && !initial.host && state.status === "waiting") { setLeft(true); return; }
      if (data.stateVersion !== undefined) apply(data, performance.now()); else await refresh();
      if (!silent) failed.current = null;
    } catch (cause) {
      if (!silent) setError(cause instanceof Error ? cause.message : text.errors.ENGINE_UNAVAILABLE);
      else setConnection("polling");
    } finally { if (silent) backgroundFlight.current = false; else { inFlight.current = false; setBusy(false); } }
  }, [matchId, initial.self.id, initial.host, state.status, apply, refresh]);
  const run = (action: string, body: object = {}) => void command({ action, body, key: crypto.randomUUID() });
  useEffect(() => {
    mounted.current = true;
    const id = window.setTimeout(() => { setInviteUrl(sessionStorage.getItem(`dd-invite:${initial.self.id}:${matchId}`) ?? ""); void refresh().catch(() => setError(text.errors.ENGINE_UNAVAILABLE)); }, 0);
    return () => { mounted.current = false; window.clearTimeout(id); };
  }, [matchId, initial.self.id, refresh]);
  useEffect(() => {
    if (terminal || left) return;
    const timer = window.setInterval(() => { void command({ action: "heartbeat", body: {} }); }, 5000);
    return () => window.clearInterval(timer);
  }, [terminal, left, command]);
  useEffect(() => {
    if (terminal || left) return;
    const timer = window.setInterval(() => setClock(performance.now()), 250);
    return () => window.clearInterval(timer);
  }, [terminal, left]);
  useEffect(() => {
    let cancelled = false;
    const client = createClient();
    const channel = client.channel(`match:${matchId}`, { config: { private: true, presence: { key: initial.self.id } } });
    const update = () => { if (!cancelled) void refresh().catch(() => setConnection("polling")); };
    void client.auth.getSession().then(async ({ data }) => {
      // Session is used only as the transport token, never as server identity proof.
      await client.realtime.setAuth(data.session?.access_token);
      if (cancelled) return;
      channel.on("broadcast", { event: "match_updated" }, update).subscribe(status => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") { setConnection("live"); void channel.track({ userId: initial.self.id }); update(); }
        else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) setConnection("polling");
      });
    }).catch(() => { if (!cancelled) setConnection("polling"); });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => { void client.realtime.setAuth(session?.access_token); update(); });
    const visibility = () => { if (document.visibilityState === "visible") update(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { cancelled = true; listener.subscription.unsubscribe(); document.removeEventListener("visibilitychange", visibility); void client.removeChannel(channel); };
  }, [matchId, initial.self.id, refresh]);
  useEffect(() => {
    if (connection === "live" || terminal || left) return;
    const timer = window.setInterval(() => void refresh().catch(() => {}), 2000);
    return () => window.clearInterval(timer);
  }, [connection, terminal, left, refresh]);
  const serverNow = anchor.server + clock - anchor.local;
  const starts = state.round.startsAt ? Date.parse(state.round.startsAt) : 0;
  const ends = state.round.endsAt ? Date.parse(state.round.endsAt) : 0;
  const seconds = Math.max(0, Math.ceil(((state.status === "countdown" ? starts : ends) - serverNow) / 1000));
  useEffect(() => {
    if (!["countdown", "playing"].includes(state.status) || seconds > 0) return;
    const timer = window.setTimeout(() => void command({ action: "sync", body: {} }), 100);
    return () => window.clearTimeout(timer);
  }, [state.status, state.stateVersion, seconds, command]);
  useEffect(() => { if (terminal) resultHeading.current?.focus(); }, [terminal]);
  const own = state.players.find(player => player.id === state.self.id);
  const guest = state.players.find(player => player.slot === 2);
  if (left) return <div className="empty-state"><h1>{text.left}</h1><Link className="button button-primary" href="/play">{text.returnPlay}</Link></div>;
  return <div className="match-room"><p className="notice">{text.preview}</p>
    <div className="match-room-top"><h1>{state.status === "waiting" ? text.waiting : terminal ? text.finished : state.status === "countdown" ? text.countdown : text.playing}</h1><span role="status" className="muted">{connection === "live" ? text.connected : connection === "connecting" ? text.reconnecting : text.polling}</span></div>
    {error && <div className="form-error" role="alert"><p>{error}</p>{<button type="button" className="button button-secondary" disabled={busy} onClick={() => failed.current && void command(failed.current)}>{text.retry}</button>}</div>}
    <div className="match-players">{[1, 2].map(slot => { const player = state.players.find(p => p.slot === slot); return <div className="profile-panel" key={slot}><h2>{player ? `@${player.username}` : text.emptySeat}</h2>{player && <><p>{text.score}: <strong>{player.score}</strong></p><p>{player.ready ? text.ready : text.notReady}</p></>}</div>; })}</div>
    {state.status === "waiting" && <section className="profile-panel"><p>{text.waitingReady}</p>
      {state.host && !guest && <div className="match-invite"><h2>{text.invite}</h2><p className="muted">{text.share}</p>{inviteUrl ? <><input aria-label={text.invite} readOnly value={inviteUrl} /><button type="button" className="button button-secondary" onClick={() => { void navigator.clipboard.writeText(inviteUrl).then(() => setCopied(true)).catch(() => setError(text.errors.ENGINE_UNAVAILABLE)); }}>{text.copy}</button>{copied && <p role="status">{text.copied}</p>}</> : <p>{text.inviteMissing}</p>}<button type="button" className="button button-secondary" disabled={busy} onClick={() => run("invite")}>{text.rotate}</button></div>}
      <div className="practice-actions"><button className="button button-primary" type="button" disabled={busy} onClick={() => run("ready", { ready: !own?.ready })}>{own?.ready ? text.notReady : text.ready}</button></div>
    </section>}
    {state.status === "countdown" && <p className="match-countdown" role="status">{seconds || copy.practice.waiting}</p>}
    {state.question && <section className="practice-question"><div className="practice-status"><h2>{state.question.title}</h2>{!terminal && <strong className="practice-timer">{seconds}s</strong>}</div><p>{state.question.prompt}</p><div className="game-terminal"><CodeLines code={state.question.code} selected={selected} disabled={busy || terminal || state.status !== "playing" || own?.hasSubmitted || seconds === 0} onSelect={setSelected} correctLine={state.solution?.correctLine} /></div>
      {!terminal && <div className="practice-actions"><p>{own?.hasSubmitted ? text.submitted : selected ? `${text.answer}: ${selected}` : text.select}</p><button type="button" className="button button-primary" disabled={busy || own?.hasSubmitted || selected === null || state.status !== "playing" || seconds === 0} onClick={() => run("answers", { roundId: state.round.id, selectedLine: selected })}>{text.submit}</button></div>}
    </section>}
    {terminal && <section className="practice-result result-timeout"><div><h2 tabIndex={-1} ref={resultHeading}>{state.status !== "finished" ? state.status === "expired" ? text.expired : text.cancelled : !state.winnerId ? text.draw : state.winnerId === state.self.id ? text.victory : text.defeat}</h2>{state.solution && <p>{text.correctLine}: {state.solution.correctLine}</p>}</div><Link className="button button-primary" href="/play">{text.newRoom}</Link></section>}
    {state.solution && <details className="practice-explanation"><summary>{text.explain}</summary><div className="practice-explanation-body"><p>{state.solution.explanation}</p></div></details>}
    {!terminal && <button type="button" className="button button-secondary match-leave" disabled={busy} onClick={() => { if (window.confirm(text.confirmLeave)) run("leave"); }}>{text.leave}</button>}
  </div>;
}
