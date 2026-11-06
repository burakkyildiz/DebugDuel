"use client";
import Link from "next/link";
import { Trophy, Flag, Minus } from "lucide-react";
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
  const currentRound = useRef(initial.round.id);
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
    if (currentRound.current !== data.round.id || data.self.selectedLine !== null || data.solution !== null) setSelected(data.self.selectedLine);
    currentRound.current = data.round.id;
    if (data.players.some(player => player.slot === 2) || ["finished", "aborted", "expired", "cancelled"].includes(data.status)) {
      setInviteUrl("");
      try { sessionStorage.removeItem(`dd-invite:${data.self.id}:${data.matchId}`); } catch { /* Optional per-tab storage. */ }
    }
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
      const before = performance.now();
      const response = await fetch(`/api/matches/${matchId}/${request.action}`, { method: "POST", headers: { "Content-Type": "application/json", ...(request.key ? { "Idempotency-Key": request.key } : {}) }, body: JSON.stringify(request.body), signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok) {
        if (["ROUND_CLOSED", "ALREADY_SUBMITTED"].includes(data.error?.code)) { await refresh(); if (!silent) failed.current = null; return; }
        throw new Error(data.error?.message ?? text.errors.ENGINE_UNAVAILABLE);
      }
      if (data.inviteUrl) { try { sessionStorage.setItem(`dd-invite:${initial.self.id}:${matchId}`, data.inviteUrl); } catch { /* The visible invitation still works. */ } setInviteUrl(data.inviteUrl); setCopied(false); }
      if (request.action === "leave" && !initial.host && state.status === "waiting") { setLeft(true); return; }
      if (data.stateVersion !== undefined) apply(data, before); else await refresh();
      if (!silent) failed.current = null;
    } catch (cause) {
      if (!silent) setError(cause instanceof Error ? cause.message : text.errors.ENGINE_UNAVAILABLE);
      else setConnection("polling");
    } finally { if (silent) backgroundFlight.current = false; else { inFlight.current = false; setBusy(false); } }
  }, [matchId, initial.self.id, initial.host, state.status, apply, refresh]);
  const run = (action: string, body: object = {}) => void command({ action, body, key: crypto.randomUUID() });
  useEffect(() => {
    mounted.current = true;
    const id = window.setTimeout(() => {
      // performance.now() is relative to the document, which can predate this room.
      // Establish the local baseline before the first timer tick or state response.
      const local = performance.now();
      setAnchor({ server: Date.parse(initial.serverNow), local }); setClock(local);
      try { setInviteUrl(sessionStorage.getItem(`dd-invite:${initial.self.id}:${matchId}`) ?? ""); } catch { /* Optional per-tab storage. */ } void refresh().catch(() => setError(text.errors.ENGINE_UNAVAILABLE)); }, 0);
    return () => { mounted.current = false; window.clearTimeout(id); };
  }, [matchId, initial.self.id, initial.serverNow, refresh]);
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
  }, [matchId, initial.self.id, initial.serverNow, refresh]);
  useEffect(() => {
    if (connection === "live" || terminal || left) return;
    const timer = window.setInterval(() => void refresh().catch(() => {}), 2000);
    return () => window.clearInterval(timer);
  }, [connection, terminal, left, refresh]);
  const serverNow = anchor.server + clock - anchor.local;
  const deadline = state.nextPhaseAt ?? (state.status === "countdown" ? state.round.startsAt : state.round.endsAt);
  const seconds = Math.max(0, Math.ceil(((deadline ? Date.parse(deadline) : serverNow) - serverNow) / 1000));
  useEffect(() => {
    if (!["countdown", "playing", "between_rounds"].includes(state.status) || seconds > 0) return;
    const timer = window.setTimeout(() => void command({ action: "sync", body: {} }), 100);
    return () => window.clearTimeout(timer);
  }, [state.status, state.stateVersion, seconds, command]);
  useEffect(() => { if (terminal) resultHeading.current?.focus(); }, [terminal]);
  const own = state.players.find(player => player.id === state.self.id);
  const guest = state.players.find(player => player.slot === 2);
  if (left) return <div className="empty-state"><h1>{text.left}</h1><Link className="button button-primary" href="/play">{text.returnPlay}</Link></div>;
  const full = state.stage === "full_match";
  const between = state.status === "between_rounds";
  const ownRoundWinner = state.round.winnerId === state.self.id;
  const closedRound = state.rounds?.find(round => round.id === state.round.id);
  const roundReason = closedRound?.endReason === "correct_answer" ? ownRoundWinner ? text.wonFirst : state.self.selectedLine === null ? text.rivalFirst : text.rivalFirstAnswered : closedRound?.endReason === "both_incorrect" ? text.bothWrong : closedRound?.endReason === "timeout" ? text.roundTimeout : null;
  const roundResult = state.round.winnerId ? ownRoundWinner ? text.roundVictory : text.roundDefeat : text.roundDraw;
  const finalResult = state.status === "aborted" ? text.aborted : state.status !== "finished" ? state.status === "expired" ? text.expired : text.cancelled : !state.winnerId ? full ? text.matchDraw : text.draw : state.winnerId === state.self.id ? full ? text.matchVictory : text.victory : full ? text.matchDefeat : text.defeat;
  const decided = state.status === "finished" && state.winnerId !== null;
  const outcome = decided ? state.winnerId === state.self.id ? "win" : "loss" : "neutral";
  const ResultIcon = outcome === "win" ? Trophy : outcome === "loss" ? Flag : Minus;
  const connectionReason = state.winnerId === state.self.id ? text.rivalDisconnected : text.youDisconnected;
  const reason = state.endedReason === "connection_lost" && decided ? connectionReason.replace("{player}", `@${state.players.find(player => player.id !== state.self.id)?.username ?? ""}`) : state.endedReason && Object.hasOwn(text.reasons, state.endedReason) ? text.reasons[state.endedReason as keyof typeof text.reasons] : null;
  const previous = state.rounds?.filter(round => round.solution && round.question && (round.number !== state.round.number || !state.question)) ?? [];
  return <div className="match-room">
    <p className="notice">{full ? text.fullMatch : text.preview}</p>
    <div className="match-room-top"><div>
      {full && state.status !== "waiting" && <p className="eyebrow">{text.round} {state.round.number}/3</p>}
      <h1>{state.status === "waiting" ? text.waiting : terminal ? full ? text.matchFinished : text.finished : between ? text.between : state.status === "countdown" ? text.countdown : text.playing}</h1>
    </div><span role="status" className="muted">{connection === "live" ? text.connected : connection === "connecting" ? text.reconnecting : text.polling}</span></div>
    {error && <div className="form-error" role="alert"><p>{error}</p><button type="button" className="button button-secondary" disabled={busy} onClick={() => { if (failed.current) void command(failed.current); else void refresh().catch(() => setError(text.errors.ENGINE_UNAVAILABLE)); }}>{text.retry}</button></div>}
    {terminal && <section className={`match-outcome match-outcome-${outcome}`} aria-labelledby="match-outcome-heading">
      <div className="match-outcome-main"><span className="match-outcome-icon"><ResultIcon aria-hidden="true" size={32} /></span><div><p className="eyebrow">{text.matchFinished}</p><h2 id="match-outcome-heading" tabIndex={-1} ref={resultHeading}>{finalResult}</h2>{decided && <p className="match-outcome-winner">@{state.players.find(player => player.id === state.winnerId)?.username} {text.winsMatch}</p>}{reason && <p>{reason}</p>}</div></div>
      <div className="match-outcome-footer"><div className="match-final-score" aria-label={text.finalScore}>{state.players.map((player, index) => <span className="match-final-score-entry" key={player.id}>{index > 0 && <span aria-hidden="true" className="match-score-divider">:</span>}<span><strong>{player.score}</strong><small>@{player.username}</small></span></span>)}</div><Link className="button button-primary" href="/play">{text.newRoom}</Link></div>
    </section>}
    <div className="match-players">{[1, 2].map(slot => {
      const player = state.players.find(p => p.slot === slot);
      const online = player && serverNow - Date.parse(player.lastSeenAt) < 15000;
      const playerOutcome = decided && player ? player.id === state.winnerId ? "winner" : "loser" : state.status === "finished" ? "draw" : null;
      return <div className={`profile-panel${playerOutcome ? ` match-player-${playerOutcome}` : ""}`} key={slot}>{playerOutcome && <span className="match-player-outcome">{playerOutcome === "draw" ? text.matchDraw : text[playerOutcome]}</span>}<h2>{player ? `@${player.username}` : text.emptySeat}</h2>{player && <>
        <p>{text.score}: <strong>{player.score}</strong></p>
        {!terminal && <p>{state.status === "waiting" ? player.ready ? text.ready : text.notReady : online ? text.connectedPlayer : text.reconnecting}</p>}
      </>}</div>;
    })}</div>
    {state.status === "waiting" && <section className="profile-panel"><p>{text.waitingReady}</p><p className="muted">{text.roundRule}</p>
      {state.host && !guest && <div className="match-invite"><h2>{text.invite}</h2><p className="muted">{text.share}</p>{inviteUrl ? <><input aria-label={text.invite} readOnly value={inviteUrl} /><button type="button" className="button button-secondary" onClick={() => { void navigator.clipboard.writeText(inviteUrl).then(() => setCopied(true)).catch(() => setError(text.errors.ENGINE_UNAVAILABLE)); }}>{text.copy}</button>{copied && <p role="status">{text.copied}</p>}</> : <p>{text.inviteMissing}</p>}<button type="button" className="button button-secondary" disabled={busy} onClick={() => run("invite")}>{text.rotate}</button></div>}
      <div className="practice-actions"><button className="button button-primary" type="button" disabled={busy} onClick={() => run("ready", { ready: !own?.ready })}>{own?.ready ? text.notReady : text.ready}</button></div>
    </section>}
    {state.status === "countdown" && <p className="match-countdown" role="status">{seconds || copy.practice.waiting}</p>}
    {between && <section className={`practice-result ${state.round.winnerId ? ownRoundWinner ? "result-correct" : "result-incorrect" : "result-timeout"}`} role="status"><div><h2>{roundResult}</h2>{roundReason && <p>{roundReason}</p>}<p>{text.nextRound}: {seconds} {text.seconds}</p></div></section>}
    {state.question && <section className="practice-question"><div className="practice-status"><div>
      {state.question.difficulty && <p className="eyebrow">Python · {text.difficulties[state.question.difficulty]}</p>}
      <h2>{state.question.title}</h2></div>{!terminal && !between && <strong className="practice-timer">{seconds}s</strong>}
    </div><p>{state.question.prompt}</p><div className="game-terminal"><CodeLines code={state.question.code} selected={selected} disabled={busy || terminal || state.status !== "playing" || own?.hasSubmitted || seconds === 0} onSelect={setSelected} correctLine={state.solution?.correctLine} /></div>
      {!terminal && !between && <div className="practice-actions"><p>{own?.hasSubmitted ? text.submitted : selected ? `${text.answer}: ${selected}` : text.select}</p><button type="button" className="button button-primary" disabled={busy || own?.hasSubmitted || selected === null || state.status !== "playing" || seconds === 0} onClick={() => run("answers", { roundId: state.round.id, selectedLine: selected })}>{text.submit}</button></div>}
    </section>}

    {terminal && state.solution && <details key={state.round.id} className="practice-explanation"><summary>{text.explain}</summary><div className="practice-explanation-body"><p>{state.solution.explanation}</p></div></details>}
    {terminal && full && state.rounds && <section className="profile-panel match-summary"><h2>{text.matchSummary}</h2><table><thead><tr><th scope="col">{text.round}</th>{state.players.map(player => <th key={player.id} scope="col">@{player.username}</th>)}</tr></thead><tbody>{state.rounds.map(round => <tr key={round.id}><th scope="row">{round.number}{round.question === null && <small> · {text.notPlayed}</small>}</th>{state.players.map(player => <td key={player.id}>{round.solution?.answers.find(answer => answer.userId === player.id)?.points ?? 0}</td>)}</tr>)}</tbody></table></section>}
    {terminal && previous.length > 0 && <section className="match-history"><h2>{text.previousRounds}</h2>{previous.map(round => <details className="practice-explanation" key={round.id}><summary>{text.reviewRound} {round.number}: {round.question!.title}</summary><div className="practice-explanation-body"><p>{text.yourAnswer}: {round.selectedLine ?? text.noAnswer}</p><CodeLines code={round.question!.code} correctLine={round.solution!.correctLine} /><p>{round.solution!.explanation}</p></div></details>)}</section>}
    {!terminal && <button type="button" className="button button-secondary match-leave" disabled={busy} onClick={() => { if (window.confirm(text.confirmLeave)) run("leave"); }}>{text.leave}</button>}
  </div>;
}
