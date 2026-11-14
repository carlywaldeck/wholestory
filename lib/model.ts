import { z } from "zod";
import { cycleAnalysis } from "./cycles";
export const categories = [
  "Pelvic pain",
  "Bloating",
  "Fatigue",
  "Bowel discomfort",
  "Urinary symptoms",
  "Pain",
  "Pain during sex",
  "Pain with bowel movements",
  "Pain with urination",
  "Gastrointestinal symptoms",
] as const;
export const factKinds = [
  ...categories,
  "Location",
  "Severity",
  "Timing",
  "Menstrual context",
  "Cycle day",
  "Cycle start",
  "Bleeding level",
  "Fatigue score",
  "Daily-life impact",
  "Intervention",
  "Medication effect",
  "What helped",
  "Uncertainty",
] as const;
export const factSchema = z
  .object({
    kind: z.enum(factKinds),
    value: z.string().min(1).max(500),
    quote: z.string().min(1).max(2000),
  })
  .strict();
export const extractionSchema = z
  .object({
    facts: z.array(factSchema).max(30),
    symptomFree: z.boolean(),
    followUp: z.string().max(200).nullable(),
  })
  .strict();
export const entrySchema = z
  .object({
    id: z.string().min(1).max(100),
    date: z.iso.date(),
    text: z.string().min(1).max(10000),
    facts: z.array(factSchema).max(30),
    symptomFree: z.boolean(),
    demo: z.boolean(),
    persona: z.enum(["maya", "alex", "jules"]).optional(),
  })
  .strict();
export type Fact = z.infer<typeof factSchema>;
export type Entry = z.infer<typeof entrySchema>;
export function isPresentFact(f: Fact) {
  return !/^(?:no|none|false|absent|unknown|not present|0)(?:\b|$)/i.test(
    f.value,
  );
}
export function validateEvidence(text: string, facts: Fact[]) {
  return facts.every((f) => text.includes(f.quote));
}
export function validateEntry(input: unknown) {
  const e = entrySchema.parse(input);
  if (!validateEvidence(e.text, e.facts))
    throw Error("Every quote must appear exactly in your entry.");
  for (const f of e.facts) {
    if (
      ["Severity", "Fatigue score"].includes(f.kind) &&
      /^(10|[0-9])(?:\/10)?$/.test(f.value)
    ) {
      const n = Number(f.value.split("/")[0]);
      if (
        !new RegExp("\\b" + n + "\\s*(?:/\\s*10|out of\\s*10)\\b", "i").test(
          f.quote,
        )
      )
        throw Error(
          "A numeric score needs an explicit score out of 10 in its source quote.",
        );
    }
    if (
      f.kind === "Cycle day" &&
      (!/^\d+$/.test(f.value) || Number(f.value) < 1 || Number(f.value) > 120)
    )
      throw Error(
        "Cycle day must be a whole number from 1 to 120. Leave it unknown if you are unsure.",
      );
    if (f.kind === "Cycle start" && !z.iso.date().safeParse(f.value).success)
      throw Error("Cycle start must be a valid date.");
    if (
      f.kind === "Bleeding level" &&
      !["None", "Spotting", "Light", "Moderate", "Heavy"].includes(f.value)
    )
      throw Error("Choose an explicit bleeding level.");
    if (f.kind === "Fatigue score" && !/^(10|[0-9])(?:\/10)?$/.test(f.value))
      throw Error("Fatigue score must be from 0 to 10.");
  }
  if (
    e.symptomFree &&
    e.facts.some(
      (f) =>
        categories.includes(f.kind as (typeof categories)[number]) &&
        isPresentFact(f),
    )
  )
    throw Error("A symptom-free entry cannot also contain symptoms.");
  const start = e.facts.find((f) => f.kind === "Cycle start")?.value;
  const day = e.facts.find((f) => f.kind === "Cycle day")?.value;
  if (start && start > e.date)
    throw Error("The period-start date cannot be after the entry date.");
  if (
    start &&
    day &&
    Math.round((Date.parse(e.date) - Date.parse(start)) / 86400000) + 1 !==
      Number(day)
  )
    throw Error(
      "The reported cycle day and period-start date do not match this entry date.",
    );
  return e;
}
export function manualExtraction(text: string, previous: Entry[] = []) {
  const lower = text.toLowerCase();
  const impact =
    /missed|prevent|couldn't|could not|work|class|school|interfer|cancel/.test(
      lower,
    );
  const timing = /hour|minute|all day|morning|afternoon|evening|lasted/.test(
    lower,
  );
  const menstrual = /period|menstrua|cycle/.test(lower);
  return {
    facts: [] as Fact[],
    symptomFree: false,
    followUp: !impact
      ? "Did the symptoms interfere with anything you wanted to do today?"
      : !timing
        ? "How long did the discomfort last?"
        : !menstrual
          ? "Did this happen during your period or outside of it?"
          : previous.length
            ? "Was this different from what you usually experience?"
            : null,
  };
}
export function insights(entries: Entry[]) {
  const days = (es: Entry[]) => new Set(es.map((e) => e.date)).size;
  return {
    logged: days(entries),
    free: days(entries.filter((e) => e.symptomFree)),
    items: [...categories, "Daily-life impact"]
      .map((kind) => {
        const sources = entries.filter((e) =>
          e.facts.some((f) => f.kind === kind && isPresentFact(f)),
        );
        return { kind, days: days(sources), ids: sources.map((e) => e.id) };
      })
      .concat(
        (() => {
          const sources = entries.filter((e) =>
            e.facts.some(
              (f) =>
                f.kind === "Menstrual context" &&
                /not on my period|not on (?:a |my )?period|outside (?:of )?(?:my |a )?period|outside menstruation/i.test(
                  f.quote,
                ),
            ),
          );
          return [
            {
              kind: "Outside menstruation",
              days: days(sources),
              ids: sources.map((e) => e.id),
            },
          ];
        })(),
      ),
  };
}
export function report(entries: Entry[]) {
  const s = insights(entries);
  return {
    range: entries.length
      ? [...entries]
          .map((e) => e.date)
          .sort()
          .filter((_, i, a) => i === 0 || i === a.length - 1)
          .join(" to ")
      : "No entries",
    logged: s.logged,
    patterns: cycleAnalysis(entries).recurring.slice(0, 3),
    claims: s.items
      .filter((x) => x.days)
      .map((x) => ({
        ...x,
        text: `${x.kind}: reported on ${x.days} of ${s.logged} logged days.`,
      })),
    quotes: entries.flatMap((e) =>
      e.facts.map((f) => ({
        id: e.id,
        date: e.date,
        quote: f.quote,
        kind: f.kind,
      })),
    ),
  };
}
