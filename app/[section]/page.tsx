import Home from "../page";
export function generateStaticParams() {
  return ["calendar", "outlook", "journal", "appointment-brief", "settings", "privacy", "welcome"].map(section=>({section}));
}
export const dynamicParams = false;
export default function SectionPage() { return <Home />; }
