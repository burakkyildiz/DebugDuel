import { copy } from "@/content/copy.en";
export default function Loading() {
  return <section className="page-loading" role="status" aria-live="polite">
    <span className="page-loading-label">{copy.errors.loading}<span className="page-loading-cursor" aria-hidden="true" /></span>
  </section>;
}
