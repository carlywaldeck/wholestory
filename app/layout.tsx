import "./globals.css";
export const metadata = {
  title: "WholeStory — Private symptom journal",
  description: "A private symptom journal with evidence-linked insights.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
