"use client";
import { Check, FileText, PenLine } from "lucide-react";

type JourneyStep = "capture" | "review" | "prepare";
const steps = [
  { id: "capture" as const, label: "Capture", hint: "Your experience", icon: PenLine },
  { id: "review" as const, label: "Review", hint: "Check the details", icon: Check },
  { id: "prepare" as const, label: "Prepare", hint: "Appointment brief", icon: FileText },
];

export function JourneyProgress({ current, hasEntries, onNavigate }: {
  current: JourneyStep;
  hasEntries: boolean;
  onNavigate: (step: JourneyStep) => void;
}) {
  const currentIndex = steps.findIndex((step) => step.id === current);
  return (
    <nav className="journey-progress" aria-label="elya journey">
      {steps.map((step, index) => {
        const complete = index < currentIndex || (step.id === "capture" && hasEntries && current !== "capture");
        const Icon = complete ? Check : step.icon;
        return (
          <button key={step.id} className={step.id === current ? "current" : complete ? "complete" : ""} aria-current={step.id === current ? "step" : undefined} onClick={() => onNavigate(step.id)}>
            <span className="journey-progress-icon"><Icon size={14} /></span>
            <span><strong>{step.label}</strong><small>{step.hint}</small></span>
          </button>
        );
      })}
    </nav>
  );
}
