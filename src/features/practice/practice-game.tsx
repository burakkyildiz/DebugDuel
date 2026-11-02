"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Clock3, Crosshair, CircleCheck, CircleX } from "lucide-react";
import { copy } from "@/content/copy.en";
import { CodeLines } from "@/components/game/code-lines";
import { practiceStateSchema, uuid, type PracticeState } from "./contracts";

type Command = { action: "create" | "get" | "answer"; sessionId?: string; selectedLine?: number; key?: string };
const text = copy.practice;

export function PracticeGame() {
  const [state, setState] = useState<PracticeState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(0);
  const [retryAt, setRetryAt] = useState(0);
  const pending = useRef<Command | null>(null);
  const anchor = useRef({ server: 0, local: 0 });
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const solutionHeading = useRef<HTMLHeadingElement>(null);

  const execute = useCallback(async (command: Command) => {
    if (inFlight.current) return;
    inFlight.current = true;
    pending.current = command;
    setBusy(true);
    setError("");
    try {
      const headers = { "Content-Type": "application/json", "Idempotency-Key": command.key ?? crypto.randomUUID() };
      if (command.action === "create") {
        // Establish cookie ownership before the idempotent start request.
        const bootstrap = await fetch("/api/practice/guest", { method: "POST", headers, body: "{}", signal: AbortSignal.timeout(15000) });
        if (!bootstrap.ok) throw new Error(text.errors.PRACTICE_UNAVAILABLE);
      }
      const before = performance.now();
      const path = command.action === "create" ? "/api/practice/sessions" : `/api/practice/sessions/${command.sessionId}${command.action === "answer" ? "/answer" : ""}`;
      const response = await fetch(path, command.action === "get" ? { cache: "no-store", signal: AbortSignal.timeout(15000) } : {
        method: "POST", headers, signal: AbortSignal.timeout(15000), body: JSON.stringify(command.action === "answer" ? { selectedLine: command.selectedLine } : {}),
      });
      const payload = await response.json();
      if (!response.ok) {
        const code = payload?.error?.code as keyof typeof text.errors;
        if (code === "RATE_LIMITED") setRetryAt(Date.now() + Math.min(3600, Math.max(1, Number(response.headers.get("Retry-After")) || 60)) * 1000);
        throw new Error(text.errors[code] ?? text.errors.PRACTICE_UNAVAILABLE);
      }
      const result = practiceStateSchema.parse(payload);
      if (!mounted.current) return;
      const received = performance.now();
      anchor.current = { server: Date.parse(result.serverNow), local: (before + received) / 2 };
      setClock(received);
      setState(result);
      setSelected(result.selectedLine);
      pending.current = null;
      const url = new URL(window.location.href);
      url.searchParams.set("session", result.sessionId);
      window.history.replaceState(null, "", url);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error && Object.values(text.errors).some(value => value === cause.message) ? cause.message : text.errors.PRACTICE_UNAVAILABLE);
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const id = new URL(window.location.href).searchParams.get("session");
    // The task runs after the first effect cleanup in React Strict Mode.
    const timer = window.setTimeout(() => { if (uuid.safeParse(id).success) void execute({ action: "get", sessionId: id! }); }, 0);
    return () => { mounted.current = false; window.clearTimeout(timer); };
  }, [execute]);

  useEffect(() => {
    if (state?.status !== "active") return;
    const timer = window.setInterval(() => setClock(performance.now()), 250);
    const sync = () => { if (document.visibilityState === "visible") void execute({ action: "get", sessionId: state.sessionId }); };
    document.addEventListener("visibilitychange", sync);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", sync); };
  }, [state?.status, state?.sessionId, execute]);

  useEffect(() => {
    if (state?.status === "resolved") {
      solutionHeading.current?.focus({ preventScroll: true });
      solutionHeading.current?.closest(".practice-result")?.scrollIntoView({ block: "start" });
    }
  }, [state?.status, state?.sessionId]);

  const seconds = state ? Math.max(0, Math.ceil((Date.parse(state.endsAt) - (anchor.current.server + clock - anchor.current.local)) / 1000)) : 45;
  useEffect(() => {
    if (!state || state.status !== "active" || seconds > 0 || busy || error) return;
    // Refresh only at the deadline; the DB decides whether the solution is open.
    const timer = window.setTimeout(() => void execute({ action: "get", sessionId: state.sessionId }), 300);
    return () => window.clearTimeout(timer);
  }, [state, seconds, busy, error, execute]);

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => { setRetryAt(0); setError(""); }, Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  const start = () => void execute({ action: "create", key: crypto.randomUUID() });
  const locked = busy || !!error || state?.status !== "active" || seconds === 0;
  return <div className="practice-play">
    <p className="practice-note">{text.noProgress}</p>
    {error && <div className="form-error" role="alert"><p>{error}</p>{!retryAt && <div className="practice-actions">
      <button type="button" className="button button-secondary" disabled={busy} onClick={() => pending.current && void execute(pending.current)}>{text.retry}</button>
      <button type="button" className="button button-secondary" disabled={busy} onClick={start}>{text.next}</button>
    </div>}</div>}
    {!state ? <div className="empty-state"><span className="icon-box mint"><Crosshair size={24} aria-hidden="true" /></span><h2>{text.challenge}</h2><p>{text.keyboard}</p><button type="button" className="button button-primary" onClick={start} disabled={busy || retryAt > 0}>{busy ? text.starting : text.start}<ArrowRight size={16} aria-hidden="true" /></button></div> : <>
      <div className="practice-status"><span className="eyebrow">{state.identity === "guest" ? text.guest : text.account}</span>
        <span className={`practice-timer ${seconds <= 10 && state.status === "active" ? "urgent" : ""}`} aria-label={text.remaining}><Clock3 size={17} aria-hidden="true" />{state.status === "resolved" ? "—" : `${seconds}s`}</span>
      </div>
      <div className="sr-only" role="status">{state.status === "active" && seconds <= 10 ? text.lastSeconds : ""}</div>
      <section className="practice-question" aria-labelledby="challenge-title"><h2 id="challenge-title">{state.question.title}</h2><p>{state.question.prompt}</p>
        <div className="game-terminal"><div className="terminal-bar"><span>{text.challenge}</span><span>{text.languageLabel}</span></div>
          <CodeLines code={state.question.code} selected={selected} disabled={locked} onSelect={setSelected} correctLine={state.solution?.correctLine} />
        </div>
        {state.status === "active" && <><p className="practice-help">{text.keyboard}</p><div className="practice-actions"><span className="muted">{selected ? `${text.selected}: ${selected}` : text.noSelection}</span><button className="button button-primary" type="button" disabled={locked || selected === null} onClick={() => void execute({ action: "answer", sessionId: state.sessionId, selectedLine: selected!, key: crypto.randomUUID() })}>{busy ? copy.common.pending : seconds === 0 ? text.waiting : text.submit}</button></div></>}
      </section>
      {state.solution && <section className="practice-solution" aria-labelledby="solution-title">
        <div className={`practice-result ${state.solution.isCorrect === true ? "result-correct" : state.solution.isCorrect === false ? "result-incorrect" : "result-timeout"}`}>
          <div className="practice-result-copy">
            <span className="practice-verdict">{state.solution.isCorrect === true ? <CircleCheck aria-hidden="true" /> : state.solution.isCorrect === false ? <CircleX aria-hidden="true" /> : <Clock3 aria-hidden="true" />}{state.solution.isCorrect === true ? text.verdictCorrect : state.solution.isCorrect === false ? text.verdictIncorrect : text.verdictTimeout}</span>
            <h2 id="solution-title" ref={solutionHeading} tabIndex={-1}>{state.solution.isCorrect === true ? text.correct : state.solution.isCorrect === false ? text.incorrect : text.timeout}</h2>
            <p>{state.selectedLine !== null ? `${text.yourAnswer}: ${state.selectedLine} · ` : ""}{text.correctLine}: <strong>{state.solution.correctLine}</strong></p>
          </div>
          <button className="button button-primary" type="button" onClick={start} disabled={busy || retryAt > 0}>{busy ? copy.common.pending : text.next}<ArrowRight size={16} aria-hidden="true" /></button>
        </div>
        <details className="practice-explanation" key={state.sessionId}><summary>{text.showExplanation}</summary><div className="practice-explanation-body"><p>{state.solution.explanation}</p></div></details>
      </section>}
      {state.identity === "guest" && state.solution && <Link href="/signup" className="text-link practice-signup">{text.signUp}</Link>}
    </>}
  </div>;
}
