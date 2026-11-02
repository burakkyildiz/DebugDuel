import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import { Header, Footer } from "@/components/ui/shell";
import { copy } from "@/content/copy.en";

export const metadata: Metadata = { title: { default: "Debug Duel — Find the bug. Beat your rival.", template: "%s · Debug Duel" }, description: "Challenge a friend to a three-round Python bug hunt. Read the code, find the faulty line and make your move." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a href="#main" className="skip-link">{copy.common.skip}</a><Header /><main id="main">{children}</main><Footer /></body></html>;
}
