import "./globals.css";
export const metadata = {
  title: "Elya — Symptom outlook & journal",
  description: "Experimental cycle-aware symptom outlooks, a private journal, and clinician-ready summaries.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
