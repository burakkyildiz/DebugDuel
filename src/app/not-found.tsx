import Link from "next/link";
import { copy } from "@/content/copy.en";
export default function NotFound() { return <section className="container page-container"><div className="empty-state"><span className="eyebrow">404</span><h1>{copy.errors.notFoundTitle}</h1><p>{copy.errors.notFoundBody}</p><Link className="button button-primary" href="/">{copy.common.back}</Link></div></section>; }
