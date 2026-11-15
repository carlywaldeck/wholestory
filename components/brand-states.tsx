import { Moon, Circle, Activity, Waves } from "lucide-react";

export function DataLegend() {
  return <div className="data-legend" aria-label="How to read these records">
    <span><i className="data-mark observation" aria-hidden="true" />Observation</span>
    <span><i className="data-mark estimate" aria-hidden="true" />Estimate</span>
    <span><i className="data-mark absence" aria-hidden="true">✓</i>None reported</span>
    <span><i className="data-mark unknown" aria-hidden="true" />Unknown</span>
  </div>;
}

export function OutlookState({ state }: { state: "elevated" | "usual" | "learning" }) {
  const label = { elevated: "Elevated likelihood", usual: "Usual pattern", learning: "Still learning" }[state];
  return <span className={`outlook-state ${state}`}><i aria-hidden="true" /><span className="state-label">{label}</span></span>;
}

export function SymptomOutlook() {
  return <section className="symptom-outlook" aria-labelledby="outlook-title">
    <h2 id="outlook-title">Your symptom outlook</h2>
    <p>Still learning. No symptom-risk estimate is available here yet. Likelihood does not describe severity or urgency.</p>
    <ul>{[
      { label: "Fatigue", Icon: Moon },
      { label: "Bloating", Icon: Circle },
      { label: "Pelvic pain / cramps", Icon: Activity },
      { label: "Bowel symptoms", Icon: Waves },
    ].map(({label, Icon}) => <li key={label}>
      <span><Icon size={18} aria-hidden="true" />{label}</span>
      <OutlookState state="learning" />
    </li>)}</ul>
  </section>;
}
