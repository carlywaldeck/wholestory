import { it, expect } from "vitest";
import { buildCareEvidence } from "./care-evidence";
import { Entry } from "./model";
const e: Entry = {
  id: "1",
  date: "2026-11-14",
  text: "I missed class. I tried heat. It helped a little.",
  facts: [
    {
      kind: "Daily-life impact",
      value: "Missed class",
      quote: "I missed class.",
    },
    { kind: "Intervention", value: "Heat", quote: "I tried heat." },
    { kind: "What helped", value: "Some relief", quote: "It helped a little." },
  ],
  symptomFree: false,
  demo: false,
};
it("keeps original source wording, dates and explicit impact without inferring a diagnosis", () => {
  const r = buildCareEvidence([e, { ...e, id: "2" }]);
  expect(r.loggedDays).toBe(1);
  expect(r.topics[0].reportedDays).toBe(1);
  expect(r.topics[0].evidence[0].quote).toBe("I missed class.");
  expect(r.assessment.diagnosis).toBeNull();
  expect(r.assessment.earlierDiagnosisBenefitEstablished).toBe(false);
});
it("does not manufacture treatment outcomes or symptom-free days", () => {
  const r = buildCareEvidence([
    { ...e, text: "I tried heat.", facts: [e.facts[1]] },
  ]);
  expect(r.topics).toHaveLength(1);
  expect(r.topics[0].evidence).toHaveLength(1);
  expect(r.topics[0].evidence[0].kind).toBe("Intervention");
  expect(buildCareEvidence([]).dateRange).toBeNull();
});
it("rejects unsupported quotations and mixed demo/personal histories", () => {
  expect(() =>
    buildCareEvidence([{ ...e, text: "Different source" }]),
  ).toThrow();
  expect(() =>
    buildCareEvidence([e, { ...e, id: "demo", demo: true, persona: "maya" }]),
  ).toThrow();
});

it("retains explicitly reported lack of treatment benefit", () => {
  const r = buildCareEvidence([
    {
      ...e,
      text: "No relief after treatment.",
      facts: [
        {
          kind: "Medication effect",
          value: "No relief",
          quote: "No relief after treatment.",
        },
      ],
    },
  ]);
  expect(r.topics[0].id).toBe("treatment-response");
  expect(r.topics[0].evidence[0].reportedValue).toBe("No relief");
});
