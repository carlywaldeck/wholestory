import Home from "../page";
export function generateStaticParams() {
  return ["outlook", "journal", "appointment-brief", "settings", "privacy"].map(section=>({section}));
}
export const dynamicParams = false;
export default function SectionPage() { return <Home />; }
