import { Check, Crosshair } from "lucide-react";
import { PageHeading } from "@/components/ui/shell";
import { copy } from "@/content/copy.en";

export const metadata = { title: "Practice" };
export default function Practice() {
  const text = copy.practice;
  return <section className="container page-container"><PageHeading eyebrow={text.eyebrow} title={text.title} body={text.body} /><div className="practice-grid"><div className="empty-state"><span className="icon-box mint"><Crosshair size={23} aria-hidden="true" /></span><h2>{text.waitingTitle}</h2><p>{text.waitingBody}</p></div><aside className="info-panel"><ul className="check-list">{text.details.map(item => <li key={item}><Check size={17} aria-hidden="true" />{item}</li>)}</ul></aside></div></section>;
}
