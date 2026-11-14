import { it, expect } from "vitest";
import { cycleAnalysis, explicitScore } from "./cycles";
import { personas, personaEntries } from "./demo";
import { Entry, insights, validateEntry } from "./model";
it("keeps qualitative severity and missing scores unknown", () => {
  expect(explicitScore("severe")).toBeNull();
  expect(explicitScore(undefined)).toBeNull();
  expect(explicitScore("0/10")).toBe(0);
  expect(explicitScore("11/10")).toBeNull();
});
it("never guesses cycle context from a pain description", () => {
  const e: Entry = {
    id: "a",
    date: "2026-11-01",
    text: "Severe pain.",
    facts: [{ kind: "Pelvic pain", value: "Severe", quote: "Severe pain." }],
    demo: false,
    symptomFree: false,
  };
  const c = cycleAnalysis([e]);
  expect(c.cycles).toEqual([]);
  expect(c.recurring).toEqual([]);
  expect(c.unknownDays).toBe(1);
});
it("generates three isolated, valid synthetic personas across two explicit cycles", () => {
  for (const persona of personas) {
    const es = personaEntries(persona.id);
    expect(es.length).toBeGreaterThan(20);
    es.forEach((e) => {
      expect(e.persona).toBe(persona.id);
      expect(e.demo).toBe(true);
      expect(() => validateEntry(e)).not.toThrow();
    });
    const c = cycleAnalysis(es);
    expect(c.cycles).toHaveLength(2);
    expect(c.plot.some((row) => Object.values(row).includes(null))).toBe(true);
  }
});
it("links recurring observations to reports in each supporting cycle", () => {
  const es = personaEntries("maya");
  const c = cycleAnalysis(es);
  expect(c.recurring.length).toBeGreaterThan(0);
  for (const r of c.recurring) {
    expect(r.cycles).toBe(2);
    expect(r.ids.every((id) => es.some((e) => e.id === id))).toBe(true);
  }
});
it("does not merge logged days or infer severity from an absence", () => {
  const es = personaEntries("maya");
  const first = es[0];
  const c = cycleAnalysis([...es, { ...first, id: "duplicate" }]);
  expect(c.cycles[0].loggedDays).toBe(cycleAnalysis(es).cycles[0].loggedDays);
  const e: Entry = {
    id: "no",
    date: "2026-11-01",
    text: "No pelvic pain.",
    facts: [{ kind: "Pelvic pain", value: "No", quote: "No pelvic pain." }],
    symptomFree: true,
    demo: false,
  };
  expect(() => validateEntry(e)).not.toThrow();
  expect(insights([e]).items.find((i) => i.kind === "Pelvic pain")?.days).toBe(
    0,
  );
});
it("rejects an invented numeric score and inconsistent cycle dates", () => {
  const base: Entry = {
    id: "a",
    date: "2026-11-01",
    text: "Pain was severe.",
    facts: [{ kind: "Severity", value: "8/10", quote: "severe" }],
    demo: false,
    symptomFree: false,
  };
  expect(() => validateEntry(base)).toThrow("explicit score");
  expect(() =>
    validateEntry({
      ...base,
      text: "I am on cycle day 3. My period started on 2026-11-01.",
      facts: [
        { kind: "Cycle day", value: "3", quote: "cycle day 3" },
        { kind: "Cycle start", value: "2026-11-01", quote: "2026-11-01" },
      ],
    }),
  ).toThrow("do not match");
});
