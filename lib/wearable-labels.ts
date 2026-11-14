import { Entry, isPresentFact, categories } from "./model";
export function classifyJournalDay(entries: Entry[]) {
  const impact = entries.some((e) =>
    e.facts.some((f) => f.kind === "Daily-life impact" && isPresentFact(f)),
  );
  const free = entries.some((e) => e.symptomFree);
  const symptoms = entries.some((e) =>
    e.facts.some(
      (f) =>
        categories.includes(f.kind as (typeof categories)[number]) &&
        isPresentFact(f),
    ),
  );
  if (free && (impact || symptoms)) return "conflicting" as const;
  if (impact) return "impact" as const;
  if (entries.length && entries.every((e) => e.symptomFree))
    return "symptom-free" as const;
  return "unknown" as const;
}
