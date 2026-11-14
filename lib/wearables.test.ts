import { it, expect } from "vitest";
import {
  parseWearableCSV,
  pairDays,
  summarizeWearables,
  syntheticWearables,
  checkInCalendar,
} from "./wearables";
import { Entry } from "./model";
const entry = (date: string, free = false, impact = false): Entry => ({
  id: date,
  date,
  text: impact ? "I missed class." : "No symptoms.",
  facts: impact
    ? [
        {
          kind: "Daily-life impact",
          value: "Missed class",
          quote: "I missed class.",
        },
      ]
    : [],
  symptomFree: free,
  demo: false,
});
it("preserves missing measurements and explicit zeros; rejects malformed, duplicate and impossible rows", () => {
  expect(parseWearableCSV("date,sleep_hours,steps\n2026-11-01,,0")[0]).toEqual({
    date: "2026-11-01",
    sleepHours: null,
    steps: 0,
  });
  for (const row of [
    "2026-02-30,7,100",
    "2026-11-01,25,100",
    "2026-11-01,7,2.5",
    "2026-11-01,,",
    "2026-11-01,NaN,2",
    "2026-11-01,7,100\n2026-11-01,8,200",
  ]) {
    expect(() => parseWearableCSV("date,sleep_hours,steps\n" + row)).toThrow();
  }
});
it("does not treat unknown or merely symptom-reported days as symptom-free", () => {
  const es = [
    entry("2026-11-01", false, true),
    entry("2026-11-02", true),
    entry("2026-11-03"),
  ];
  const days = parseWearableCSV(
    "date,sleep_hours,steps\n2026-11-01,5,2000\n2026-11-02,8,7000\n2026-11-03,7,6000\n2026-11-04,7,6000",
  );
  const s = summarizeWearables(es, days, "sleepHours");
  expect(s.impactMean).toBe(5);
  expect(s.freeMean).toBe(8);
  expect(s.excluded).toBe(2);
  expect(s.sufficient).toBe(false);
  expect(pairDays(es, days)[0].quotes[0].quote).toBe("I missed class.");
});
it("deduplicates journal dates and excludes missing values per metric", () => {
  const es = [
    entry("2026-11-01", false, true),
    { ...entry("2026-11-01", false, true), id: "another" },
    entry("2026-11-02", true),
  ];
  const days = parseWearableCSV(
    "date,sleep_hours,steps\n2026-11-01,,2000\n2026-11-02,8,7000",
  );
  expect(summarizeWearables(es, days, "steps").impactCount).toBe(1);
  expect(summarizeWearables(es, days, "sleepHours").impactCount).toBe(0);
  expect(syntheticWearables(es)).toHaveLength(0);
});
it("requires three measured dates in each group before describing a comparison", () => {
  const es = Array.from({ length: 6 }, (_, i) =>
    entry(`2026-11-0${i + 1}`, i > 2, i < 3),
  );
  const days = parseWearableCSV(
    "date,sleep_hours,steps\n" +
      es.map((e, i) => `${e.date},${i < 3 ? 5 : 8},5000`).join("\n"),
  );
  expect(summarizeWearables(es, days, "sleepHours").sufficient).toBe(true);
});
it("exports only generic calendar text and valid event times", () => {
  const ics = checkInCalendar({
    date: "2026-11-15",
    time: "09:00",
    note: "Private pelvic pain note",
  });
  expect(ics).toContain("SUMMARY:Personal check-in");
  expect(ics).not.toContain("pelvic");
  expect(ics).toContain("DTEND:");
  expect(() =>
    checkInCalendar({ date: "bad", time: "99:99", note: "" }),
  ).toThrow();
});
