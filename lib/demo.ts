import { Entry, Fact } from "./model";
export function demoEntries(): Entry[] {
  return Array.from({ length: 30 }, (_, i) => i)
    .filter((i) => ![2, 5, 11, 17, 23, 28].includes(i))
    .map((i) => {
      const d = new Date();
      d.setDate(d.getDate() - 29 + i);
      const date = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      const free = i % 7 === 0;
      const parts: Fact[] = free
        ? []
        : [
            {
              kind:
                i % 3 === 0
                  ? "Bowel discomfort"
                  : i % 4 === 0
                    ? "Fatigue"
                    : "Pelvic pain",
              value:
                i % 3 === 0
                  ? "Discomfort with bowel movements"
                  : i % 4 === 0
                    ? "Low energy"
                    : "Lower abdominal aching",
              quote:
                i % 3 === 0
                  ? "Bowel movements were uncomfortable."
                  : i % 4 === 0
                    ? "I felt tired all afternoon."
                    : "My lower abdomen ached this morning.",
            },
            ...(i % 2 === 0
              ? [
                  {
                    kind: "Bloating",
                    value: "Bloating",
                    quote: "I felt bloated.",
                  } as Fact,
                ]
              : []),
            ...(i % 5 === 0
              ? [
                  {
                    kind: "Daily-life impact",
                    value: "Missed class",
                    quote: "I missed my first class.",
                  } as Fact,
                ]
              : []),
            {
              kind: "Menstrual context",
              value: i < 6 ? "During period" : "Outside period",
              quote: i < 6 ? "I am on my period." : "I am not on my period.",
            },
          ];
      return {
        id: `demo-${date}`,
        date,
        text: free
          ? "I felt well today with no symptoms."
          : parts.map((f) => f.quote).join(" "),
        facts: parts,
        symptomFree: free,
        demo: true,
      };
    });
}

export const personas = [
  {
    id: "maya",
    name: "Sophie",
    description: "Cyclical pain, bowel symptoms & missed classes",
  },
  {
    id: "alex",
    name: "Alex",
    description: "Persistent pain beyond period days",
  },
  {
    id: "jules",
    name: "Jules",
    description: "Mild cramps, little disruption & reported relief",
  },
] as const;
export type PersonaId = (typeof personas)[number]["id"];
/** Hand-authored fictional records. No real patient dataset or diagnostic labels. */
export function personaEntries(persona: PersonaId): Entry[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const first = new Date(today);
  first.setDate(first.getDate() - 55);
  const iso = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  return Array.from({ length: 56 }, (_, i) => i)
    .filter((i) => i % 4 !== 3 && i % 9 !== 8)
    .map((i) => {
      const date = new Date(first);
      date.setDate(first.getDate() + i);
      const start = new Date(first);
      start.setDate(first.getDate() + Math.floor(i / 28) * 28);
      const day = (i % 28) + 1;
      const cycle = Math.floor(i / 28);
      const parts: Fact[] = [];
      const add = (kind: Fact["kind"], value: string, quote: string) =>
        parts.push({ kind, value, quote });
      const score =
        persona === "maya"
          ? day <= 4
            ? 8
            : day <= 7
              ? 4
              : day % 6 === 0
                ? 2
                : 0
          : persona === "alex"
            ? day % 5 === 0
              ? 6
              : day % 3 === 0
                ? 4
                : 3
            : day <= 3
              ? cycle === 0
                ? 3
                : 2
              : 0;
      add("Cycle day", String(day), `I am on cycle day ${day}.`);
      add(
        "Cycle start",
        iso(start),
        `My most recent period started on ${iso(start)}.`,
      );
      add("Severity", `${score}/10`, `I rate my pain ${score}/10.`);
      add(
        "Bleeding level",
        day <= 4 ? (persona === "maya" ? "Heavy" : "Light") : "None",
        `My bleeding level is ${day <= 4 ? (persona === "maya" ? "heavy" : "light") : "none"}.`,
      );
      if (score) {
        add(
          "Pelvic pain",
          "Lower abdominal pain",
          "I felt pain in my lower abdomen.",
        );
        add("Location", "Lower abdomen", "I felt pain in my lower abdomen.");
        add(
          "Menstrual context",
          day <= 4 ? "During period" : "Outside period",
          day <= 4 ? "I am on my period." : "I am not on my period.",
        );
      }
      if (persona === "maya" && day <= 3) {
        add(
          "Daily-life impact",
          "Missed class",
          "I missed my first class because of the pain.",
        );
        add(
          "Pain with bowel movements",
          "Yes",
          "I had pain with bowel movements.",
        );
        add("Fatigue", "Low energy", "I felt tired all afternoon.");
      }
      if (persona === "alex" && day % 3 === 0) {
        add(
          "Bowel discomfort",
          "Bowel discomfort",
          "Bowel movements were uncomfortable.",
        );
        add(
          "Gastrointestinal symptoms",
          "Bloating and nausea",
          "I felt bloated and nauseated.",
        );
      }
      if (persona === "alex" && day % 10 === 0)
        add("Pain with urination", "Yes", "I had pain with urination.");
      if (persona === "alex" && day === 6)
        add("Pain during sex", "Yes", "I experienced pain during sex.");
      if (persona === "alex" && day % 7 === 0)
        add(
          "Daily-life impact",
          "Cancelled plans",
          "I cancelled plans so I could rest.",
        );
      if (persona === "jules" && day <= 3) {
        add(
          "Intervention",
          "Rest and a heat pad",
          "I tried rest and a heat pad.",
        );
        add(
          "Medication effect",
          "Felt easier afterward; uncertain why",
          "The discomfort felt easier afterward, but I am not sure why.",
        );
        add("What helped", "Rest felt helpful", "Rest felt helpful.");
      }
      if (persona === "maya" && day % 6 === 0)
        add("Bloating", "Bloating", "I felt bloated.");
      const free =
        score === 0 &&
        parts.every(
          (f) =>
            ![
              "Bloating",
              "Fatigue",
              "Bowel discomfort",
              "Gastrointestinal symptoms",
            ].includes(f.kind),
        );
      const text = [
        ...new Set(parts.map((f) => f.quote)),
        ...(free ? ["I had no symptoms today."] : []),
      ].join(" ");
      return {
        id: `persona-${persona}-${iso(date)}`,
        date: iso(date),
        text,
        facts: parts,
        symptomFree: free,
        demo: true,
        persona,
      };
    });
}
