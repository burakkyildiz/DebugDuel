"use client";
import { copy } from "@/content/copy.en";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="container page-container"><div className="empty-state" role="alert"><h1>{copy.errors.title}</h1><p>{copy.errors.body}</p><button className="button button-primary" onClick={reset}>{copy.common.retry}</button></div></section>; }
