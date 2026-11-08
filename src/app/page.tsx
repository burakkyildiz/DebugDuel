import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Code2, Crosshair, GitBranch, Terminal, Timer, Trophy, Users, Zap } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/content/copy.en";

const snippet = [
  <><span className="syntax-purple">def</span> <span className="syntax-blue">sum_numbers</span>(<span className="syntax-green">numbers</span>):</>,
  <>    <span className="syntax-yellow">total</span> = <span className="syntax-amber">0</span></>,
  <>    <span className="syntax-purple">for</span> <span className="syntax-green">number</span> <span className="syntax-purple">in</span> <span className="syntax-green">numbers</span>:</>,
  <>        <span className="syntax-yellow">total</span> = <span className="syntax-green">number</span></>,
  <>    <span className="syntax-purple">return</span> <span className="syntax-yellow">total</span></>,
];

export default async function Home() {
  const text = copy.home;
  const user = await currentUser();
  const client = user?.email_confirmed_at ? await createClient() : null;
  const profile = user && client
    ? (await client.from("profiles").select("xp,wins,losses").eq("id", user.id).maybeSingle()).data
    : null;
  return <>
    <section className="hero container">
      <div className="hero-copy"><p className="eyebrow"><span className="tiny-dot" />{text.eyebrow}</p>
        <h1>{text.titleStart}<br /><span>{text.titleEnd}</span></h1>
        <p className="hero-description">{text.description}</p>
        <div className="hero-actions"><Link href="/play" className="button button-primary"><Users size={18} aria-hidden="true" />{text.play}<ArrowUpRight size={18} aria-hidden="true" /></Link><Link href="/practice" className="button button-secondary">{text.practice}<ArrowRight size={17} aria-hidden="true" /></Link></div>
        {profile && <div className="hero-facts">
          <Link className="text-link" href="/profile">{copy.profile.xp} {profile.xp}</Link>
          <span>{copy.profile.wins} {profile.wins} · {copy.profile.losses} {profile.losses}</span>
        </div>}
        <div className="hero-facts"><span><GitBranch size={14} aria-hidden="true" />{text.detail}</span><span><Timer size={14} aria-hidden="true" />{text.duration}</span><span><Code2 size={14} aria-hidden="true" />{text.language}</span></div>
      </div>
      <div className="challenge-wrap"><div className="challenge-card">
        <div className="terminal-bar"><span className="terminal-dots"><i /><i /><i /></span><span>{text.previewFile}</span><span className="terminal-language">PY</span></div>
        <div className="challenge-top"><p className="eyebrow">{text.previewLabel}</p><h2>{text.previewTitle}</h2><p>{text.previewPrompt}</p></div>
        <div className="code-preview" aria-label="Illustrative Python code"><code>{snippet.map((line, index) => <span className="code-line" key={index}><span className="line-number" aria-hidden="true">{index + 1}</span><span>{line}</span></span>)}</code></div>
        <div className="challenge-bottom"><Crosshair size={16} aria-hidden="true" /><span>{text.previewFooter}</span></div>
      </div><div className="preview-caption"><Terminal size={13} aria-hidden="true" />{text.previewTag}<span>01 — 05</span></div></div>
    </section>
    <section className="modes-section container"><div className="section-heading"><div><p className="eyebrow">{text.modesEyebrow}</p><h2>{text.modesTitle}</h2></div><span className="section-index">/ 01</span></div>
      <div className="mode-grid"><Link href="/play" className="mode-card mode-friend"><div className="mode-card-top"><span className="icon-box violet"><Users size={22} aria-hidden="true" /></span><ArrowUpRight size={21} aria-hidden="true" /></div><h3>{text.friendTitle}</h3><p>{text.friendBody}</p><span className="mode-action">{text.friendAction}<ArrowRight size={16} aria-hidden="true" /></span></Link>
        <Link href="/practice" className="mode-card"><div className="mode-card-top"><span className="icon-box mint"><Crosshair size={22} aria-hidden="true" /></span><ArrowUpRight size={21} aria-hidden="true" /></div><h3>{text.soloTitle}</h3><p>{text.soloBody}</p><span className="mode-action">{text.soloAction}<ArrowRight size={16} aria-hidden="true" /></span></Link>
        <Link href="/leaderboard" className="mode-card"><div className="mode-card-top"><span className="icon-box amber"><Trophy size={22} aria-hidden="true" /></span><ArrowUpRight size={21} aria-hidden="true" /></div><h3>{text.leaderboardTitle}</h3><p>{text.leaderboardBody}</p><span className="mode-action">{text.leaderboardAction}<ArrowRight size={16} aria-hidden="true" /></span></Link></div>
    </section>
    <section id="how-to-play" className="steps-section container"><div className="section-heading"><div><p className="eyebrow">{text.stepsEyebrow}</p><h2>{text.stepsTitle}</h2></div><span className="section-index">/ 02</span></div><div className="steps-grid">{text.steps.map(step => <article key={step.number} className="step"><span className="step-number">{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div></section>
    <section className="container"><div className="bottom-cta"><span className="icon-box violet"><Zap size={22} aria-hidden="true" /></span><div><h2>{text.bottomTitle.split("\n").map((line, index) => <span key={line}>{index > 0 ? <br /> : null}{line}</span>)}</h2><p>{text.bottomBody}</p></div><Link href="/login" className="button button-primary">{text.play}<ArrowUpRight size={18} aria-hidden="true" /></Link><div className="cta-decoration" aria-hidden="true"><Check size={95} strokeWidth={1} /></div></div></section>
  </>;
}
