import { it, expect } from "vitest";
import {
  buildResearchDataset,
  classifyJournalDay,
  wearableQuality,
} from "./wearable-analysis";
import type { Entry } from "./model";
const entry = (date: string, impact = false): Entry => ({
  id: date,
  date,
  text: impact ? "Missed class." : "No symptoms.",
  facts: impact
    ? [
        {
          kind: "Daily-life impact",
          value: "Missed class",
          quote: "Missed class.",
        },
      ]
    : [],
  symptomFree: !impact,
  demo: false,
});
it("isolates conflicting reports and preserves missing coverage", () => {
  const a = entry("2026-11-02", true),
    b = { ...entry(a.date), id: "free" };
  expect(classifyJournalDay([a, b])).toBe("conflicting");
  const q = wearableQuality(
    [a, b],
    [
      { date: a.date, sleepHours: null, steps: 0 },
      { date: "2026-11-03", sleepHours: 7, steps: null },
    ],
  );
  expect(q.conflicts).toBe(1);
  expect(q.noJournal).toBe(1);
  expect(q.missingSleep).toBe(1);
});
it("uses only prior dates, never target-day readings or future baselines", () => {
  const days = Array.from({ length: 20 }, (_, i) => ({
    date: `2026-11-${String(i + 1).padStart(2, "0")}`,
    sleepHours: 7,
    steps: 5000,
  }));
  const es = [entry("2026-11-15", true)];
  const before = buildResearchDataset(es, days);
  const changed = days.map((d) =>
    d.date >= "2026-11-15" ? { ...d, sleepHours: 1, steps: 99999 } : d,
  );
  expect(buildResearchDataset(es, changed).rows).toEqual(before.rows);
  expect(before.rows[0].features.sleepBaseline).toBe(7);
  expect(before.rows[0].featureDates.every((d) => d < "2026-11-15")).toBe(true);
  expect(before.eligibleForClinicalPrediction).toBe(false);
});
it("does not mistake missing symptom logs or non-impact symptoms for negative labels", () => {
  const e = { ...entry("2026-11-03"), symptomFree: false };
  const r = buildResearchDataset(
    [e],
    [{ date: "2026-11-02", sleepHours: 7, steps: 5000 }],
  );
  expect(r.rows).toHaveLength(0);
  expect(r.exclusions[0].reason).toBe("unknown");
});
