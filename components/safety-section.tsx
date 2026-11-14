import { ShieldCheck } from "lucide-react";
import { safetyBoundary, clinicalSources } from "../lib/clinical-context";
export function SafetySection() {
  return (
    <details className="safety-section">
      <summary>
        <ShieldCheck size={16} /> Care, context & when to get help
      </summary>
      <p>{safetyBoundary}</p>
      <h3>Get emergency help</h3>
      <p>
        If you have pelvic pain that is severe or worsening, or pelvic pain with
        faintness, difficulty breathing, heavy vaginal bleeding, shoulder-tip
        pain, or sudden confusion, call your local emergency number or go to an
        emergency department. Do not drive yourself.
      </p>
      <h3>Get urgent medical advice</h3>
      <p>
        Seek urgent care for pelvic pain with possible pregnancy, fever or
        shivering, difficulty passing urine or stool, blood in urine or stool,
        or unusual vaginal bleeding or discharge. Do not wait to finish logging.
      </p>
      <p>
        This is general guidance, not a complete checklist or an assessment of
        your symptoms. Recurring pain also deserves a healthcare conversation.
      </p>
      <a href={clinicalSources[4].url} target="_blank" rel="noreferrer">
        Read the NHS pelvic pain guidance ↗
      </a>
      <h3>Why these details matter</h3>
      <p>
        WHO describes varied symptoms and effects on everyday life. We help you
        record what happened without assuming a cause. Symptoms can have many
        explanations.
      </p>
      <div className="source-links">
        {clinicalSources.slice(0, 4).map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
            {s.name} ↗
          </a>
        ))}
      </div>
    </details>
  );
}
