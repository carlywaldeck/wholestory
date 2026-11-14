import "./globals.css";
import "../components/forecast-experience.css";
import "../components/typography.css";
import { Inter, Rethink_Sans } from "next/font/google";
const displayFont = Rethink_Sans({ subsets: ["latin"], weight: "variable", variable: "--font-display", display: "swap", adjustFontFallback: true });
const bodyFont = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap", adjustFontFallback: true });
export const metadata = {
  title: "elya — Symptom outlook & journal",
  description: "Experimental cycle-aware symptom outlooks, a private journal, and clinician-ready summaries.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
