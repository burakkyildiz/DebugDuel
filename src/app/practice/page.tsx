import { Check } from "lucide-react";
import { PageHeading } from "@/components/ui/shell";
import { PracticeGame } from "@/features/practice/practice-game";
import { copy } from "@/content/copy.en";

export const metadata = { title: "Practice" };
export default function Practice() {
  const text = copy.practice;
  return <section className="container page-container"><PageHeading eyebrow={text.eyebrow} title={text.title} body={text.body} /><div className="practice-grid"><PracticeGame /><aside className="info-panel practice-info"><ul className="check-list">{text.details.map(item => <li key={item}><Check size={17} aria-hidden="true" />{item}</li>)}</ul></aside></div></section>;
}
