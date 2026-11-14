import { describe, it, expect } from "vitest";
import { riskSymptoms, symptomRisk, type RiskInput } from "./symptom-risk";

const date = (n: number) =>
  new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10);
function fixture(n = 96): RiskInput {
  return {
    kind: "synthetic",
    targetDate: date(n),
    asOf: date(n) + "T00:00:00Z",
    days: Array.from({ length: n }, (_, i) => ({
      date: date(i),
      availableAt: date(i) + "T20:00:00Z",
      symptoms: Object.fromEntries(
        riskSymptoms.map((s) => [
          s,
          s === "pelvicPain" ? i % 6 < 3 : s === "fatigue" ? i % 6 >= 3 : null,
        ]),
      ),
    })),
  };
}
describe("personal symptom risk", () => {
  it("estimates separate outcomes and withholds unanswered symptoms", () => {
    const r = symptomRisk(fixture());
    expect(r.symptoms[0].probability).toBeLessThan(0.5);
    expect(r.symptoms[1].probability).toBeGreaterThan(0.5);
    expect(r.symptoms[2].probability).toBeNull();
    expect(r.symptoms[2].outlook).toBe("unavailable");
    expect(r.symptoms[2].trainingPairs).toBe(0);
    expect(r.symptoms[0].validation.evaluatedDays).toBeGreaterThan(0);
    expect(r.clinicalValidation).toBe(false);
    expect(r.wearableBenefitEstablished).toBe(false);
  });
  it("ignores target-day and future outcomes and late-arriving history", () => {
    const a = fixture();
    const b = structuredClone(a);
    b.days.push({
      ...b.days[0],
      date: date(96),
      availableAt: date(96) + "T20:00:00Z",
    });
    b.days.push({
      ...b.days[0],
      date: date(97),
      availableAt: date(97) + "T20:00:00Z",
    });
    expect(symptomRisk(b)).toEqual(symptomRisk(a));
    a.days[95].availableAt = date(97) + "T20:00:00Z";
    expect(symptomRisk(a).symptoms[0].reason).toBe(
      "missing-previous-day-label",
    );
  });
  it("requires both positive and explicit negative examples", () => {
    const f = fixture();
    f.days.forEach((d) => {
      d.symptoms.pelvicPain = true;
    });
    expect(symptomRisk(f).symptoms[0].reason).toBe("insufficient-history");
    expect(symptomRisk(fixture(10)).symptoms[0].probability).toBeNull();
  });
  it("never bridges missing calendar days", () => {
    const f = fixture();
    f.days = f.days.filter((_, i) => i % 2 === 0);
    expect(symptomRisk(f).symptoms[0].trainingPairs).toBe(0);
  });
  it("rejects duplicate check-ins, invalid labels and unsupported horizons", () => {
    const f = fixture();
    f.days.push(f.days[0]);
    expect(() => symptomRisk(f)).toThrow(/one confirmed/);
    expect(() =>
      symptomRisk({ ...fixture(), asOf: date(98) + "T00:00:00Z" }),
    ).toThrow(/preceding UTC/);
    expect(() =>
      symptomRisk({ ...fixture(), asOf: date(93) + "T00:00:00Z" }),
    ).toThrow(/preceding UTC/);
    const bad = fixture();
    (bad.days[0].symptoms as Record<string, unknown>).bloating = "absent";
    expect(() => symptomRisk(bad)).toThrow();
    const premature = fixture();
    premature.days[1].availableAt = date(0) + "T20:00:00Z";
    expect(() => symptomRisk(premature)).toThrow(/before its UTC symptom day/);
  });
});
