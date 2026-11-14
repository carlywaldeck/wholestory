import { it, expect } from "vitest";
import { createBrief } from "./pdf";
import { demoEntries } from "./demo";
it("keeps the month-long demo summary to one readable page", async () => {
  const p = await createBrief(
    demoEntries(),
    "I want to understand how these symptoms affect my daily life.",
    ["What could explain these symptoms?"],
    false,
    "WholeStory",
  );
  expect(p.getNumberOfPages()).toBe(1);
  const raw = p.output();
  expect(raw).toContain("SYNTHETIC DEMO DATA");
  expect(raw).toContain("Pelvic pain");
  expect(raw.indexOf("Patient statement")).toBeLessThan(
    raw.indexOf("Symptoms & everyday impact"),
  );
  expect(raw).not.toContain("endometriosis diagnosis");
});
it("adds an optional evidence appendix with dated source quotations", async () => {
  const es = demoEntries();
  const p = await createBrief(es, "", [], true, "WholeStory");
  expect(p.getNumberOfPages()).toBeGreaterThan(1);
  expect(p.output()).toContain("Evidence appendix");
  expect(p.output()).toContain(es[1].date);
});

it("keeps each fictional persona summary compact and includes source-linked cycle observations", async () => {
  const { personaEntries, personas } = await import("./demo");
  for (const persona of personas) {
    const p = await createBrief(
      personaEntries(persona.id),
      "I want to discuss the impact of these symptoms.",
      ["What should I track before our next visit?"],
      false,
      "WholeStory",
    );
    expect(p.getNumberOfPages()).toBe(1);
    expect(p.output()).toContain("Source key");
  }
});

it("includes a user-selected wearable observation with its limitations", async () => {
  const p = await createBrief(
    demoEntries(),
    "",
    [],
    false,
    "WholeStory",
    "SYNTHETIC DEMO. Sleep comparison; not a prediction.",
  );
  expect(p.output()).toContain("Wearable context");
  expect(p.output()).toContain("not a prediction");
});
