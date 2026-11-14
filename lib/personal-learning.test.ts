import { expect, it } from "vitest";
import { forecastDemo } from "./forecast-demo";
import { shiftDate } from "./forecast-time";
import { createPersonalLearner, issuePersonalOutlook, recordPersonalOutcome, savePersonalLearner, loadPersonalLearner, deletePersonalLearner } from "./personal-learning";

function demo() {
  const d = forecastDemo("maya", "2026-11-15");
  d.input.timeZone = "UTC";
  d.input.asOf = "2026-11-14T23:00:00Z";
  return d;
}

it("starts learning and freezes the issued features and prediction", () => {
  const d = demo(), state = createPersonalLearner("one", "synthetic", "UTC");
  const first = issuePersonalOutlook(state, d.input, d.physiology);
  expect(first.symptoms.every(s => s.stage === "learning-history")).toBe(true);
  expect(first.outlook.every(s => s.band === null)).toBe(true);
  expect(first.state.records).toHaveLength(8);
  expect(state.records).toHaveLength(0);
  const changed = structuredClone(d);
  changed.physiology.at(-1)!.sleepHours = 2;
  const repeated = issuePersonalOutlook(first.state, changed.input, changed.physiology);
  expect(repeated.state).toEqual(first.state);
  expect(repeated.symptoms.every(s => s.frozen)).toBe(true);
});

it("links later outcomes, keeps corrections, and never changes the issued prediction", () => {
  const d = demo(), initial = issuePersonalOutlook(createPersonalLearner("one", "synthetic", "UTC"), d.input, d.physiology).state;
  const first = recordPersonalOutcome(initial, { targetDate: "2026-11-15", symptom: "fatigue", occurred: true, reportedAt: "2026-11-15T22:00:00Z" });
  const corrected = recordPersonalOutcome(first, { targetDate: "2026-11-15", symptom: "fatigue", occurred: false, reportedAt: "2026-11-16T10:00:00Z" });
  const row = corrected.records.find(r => r.symptom === "fatigue")!;
  expect(row.outcomes.map(o => o.occurred)).toEqual([true, false]);
  expect(row.x).toEqual(initial.records.find(r => r.symptom === "fatigue")!.x);
  expect(initial.records.every(r => r.outcomes.length === 0)).toBe(true);
  expect(() => recordPersonalOutcome(corrected, { targetDate: "2026-11-15", symptom: "fatigue", occurred: true, reportedAt: "2026-11-15T23:00:00Z" })).toThrow(/backdated/);
  expect(() => recordPersonalOutcome(initial, { targetDate: "2026-11-15", symptom: "fatigue", occurred: true, reportedAt: "2026-11-14T23:30:00Z" })).toThrow(/precedes/);
});

it("automatically pairs a later confirmed journal entry with an earlier issuance", () => {
  const d = demo();
  const initial = issuePersonalOutlook(createPersonalLearner("one", "synthetic", "UTC"), d.input, d.physiology).state;
  const next = forecastDemo("maya", "2026-11-17");
  next.input.timeZone = "UTC";
  next.input.asOf = "2026-11-16T23:00:00Z";
  next.input.days.find(r => r.date === "2026-11-15")!.symptoms.fatigue = true;
  const result = issuePersonalOutlook(initial, next.input, next.physiology);
  const row = result.state.records.find(r => r.targetDate === "2026-11-15" && r.symptom === "fatigue")!;
  expect(row.outcomes.at(-1)!.occurred).toBe(true);
  expect(row.x).toEqual(initial.records.find(r => r.symptom === "fatigue")!.x);
  expect(result.symptoms.find(r => r.symptom === "fatigue")!.trainingPairs).toBe(1);
  const missing = structuredClone(next);
  missing.input.asOf = "2026-11-16T23:30:00Z";
  const day = missing.input.days.find(r => r.date === "2026-11-15")!;
  day.symptoms.fatigue = null;
  day.availableAt = "2026-11-16T23:15:00Z";
  const preserved = issuePersonalOutlook(result.state, missing.input, missing.physiology);
  expect(preserved.state.records.find(r => r.targetDate === "2026-11-15" && r.symptom === "fatigue")!.outcomes.at(-1)!.occurred).toBe(true);
});

it("learns an engineered personal sensor relationship using earlier validation only", () => {
  // Fictional wiring fixture, not medical evidence or an accuracy benchmark.
  const state = createPersonalLearner("synthetic-person", "synthetic", "UTC");
  let seed = 4117, previous = 0;
  for (let i = 0; i < 100; i++) {
    seed = (seed*1664525+1013904223) >>> 0;
    const y = Number(seed/2**32 < .5), date = shiftDate("2026-07-25", i);
    state.records.push({ symptom: "fatigue", targetDate: date, issuedAt: `${shiftDate(date, -1)}T18:00:00Z`,
      x: [previous, .5, .5, 7, ...Array(5).fill(null), y ? 4 : 9, ...Array(13).fill(null)],
      source: "synthetic", estimate: null, baselineEstimate: null, usedWearables: false, trainingPairs: 0,
      outcomes: [{ occurred: Boolean(y), reportedAt: `${shiftDate(date, 1)}T00:00:00Z` }] });
    previous = y;
  }
  const d = demo();
  const lowSleep = d.physiology.map(r => r.date === "2026-11-14" ? { ...r, sleepHours: 4 } : r);
  const highSleep = d.physiology.map(r => r.date === "2026-11-14" ? { ...r, sleepHours: 9 } : r);
  const high = issuePersonalOutlook(state, d.input, lowSleep).symptoms.find(s => s.symptom === "fatigue")!;
  const low = issuePersonalOutlook(state, d.input, highSleep).symptoms.find(s => s.symptom === "fatigue")!;
  expect(high.usedWearables).toBe(true);
  expect(high.validation!.selectedWearables).toBe(true);
  expect(high.candidateEstimate!).toBeGreaterThan(low.candidateEstimate!+.2);
  expect(high.trainingPairs).toBe(100);
});

it("keeps real/synthetic profiles separate and ignores target-day measurements", () => {
  const d = demo(), state = createPersonalLearner("one", "synthetic", "UTC");
  expect(() => issuePersonalOutlook(createPersonalLearner("one", "real", "UTC"), d.input, d.physiology)).toThrow(/data kind/);
  const original = issuePersonalOutlook(state, d.input, d.physiology);
  const future = { ...d.physiology[0], date: "2026-11-15", availableAt: "2026-11-15T12:00:00Z", sleepHours: 0 };
  expect(issuePersonalOutlook(state, d.input, [...d.physiology, future]).state).toEqual(original.state);
});

it("round-trips a namespaced local storage port without touching journal keys", async () => {
  const values = new Map<string, string>();
  const storage = { getItem: async (k: string) => values.get(k) ?? null,
    setItem: async (k: string, v: string) => { values.set(k, v); },
    removeItem: async (k: string) => { values.delete(k); } };
  const state = createPersonalLearner("one", "real", "UTC");
  await savePersonalLearner(storage, state);
  expect(await loadPersonalLearner(storage, "one")).toEqual(state);
  expect(await loadPersonalLearner(storage, "two")).toBeNull();
  expect([...values.keys()]).toEqual(["elya-personal-learning-v1:one"]);
  await deletePersonalLearner(storage, "one");
  expect(await loadPersonalLearner(storage, "one")).toBeNull();
});
