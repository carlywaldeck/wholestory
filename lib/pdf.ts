import { Entry, report, categories } from "./model";
import { safetyBoundary } from "./clinical-context";
/** A compact first page with numbered source references; quotes get separate pages. */
export async function createBrief(
  entries: Entry[],
  statement: string,
  questions: string[],
  appendix: boolean,
  brand: string,
) {
  const { jsPDF } = await import("jspdf");
  const p = new jsPDF();
  const r = report(entries);
  let y = 19;
  const ref = (id: string) => entries.findIndex((e) => e.id === id) + 1;
  const line = (text: string, size = 10, space = 2) => {
    p.setFontSize(size);
    const lines = p.splitTextToSize(text, 174);
    for (const row of lines) {
      if (y > 274) {
        p.addPage();
        y = 20;
      }
      p.text(row, 18, y);
      y += size * 0.42;
    }
    y += space;
  };
  line(`${brand} | Appointment brief`, 19, 4);
  if (entries.some((e) => e.demo)) line("SYNTHETIC DEMO DATA", 9);
  line(`${r.range} | ${r.logged} logged days`, 10);
  line("Patient-reported documentation. Unlogged days are unknown.", 9, 4);
  if (statement.trim()) {
    p.setFont("helvetica", "bold");
    line("Patient statement (user authored)", 11);
    p.setFont("helvetica", "normal");
    line(statement.slice(0, 600), 9);
  }
  p.setFont("helvetica", "bold");
  line("Symptoms & everyday impact", 12);
  p.setFont("helvetica", "normal");
  const common = r.claims
    .filter((c) => categories.includes(c.kind as (typeof categories)[number]))
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);
  const impact = r.claims.find((c) => c.kind === "Daily-life impact");
  [...common, ...(impact ? [impact] : [])].forEach((c) =>
    line(`${c.text} [${c.ids.map(ref).join(", ")}]`, 9),
  );
  if (r.patterns.length) {
    line("Recurring observations (not a prediction)", 11);
    r.patterns
      .slice(0, 2)
      .forEach((c) => line(`${c.text} [${c.ids.map(ref).join(", ")}]`, 9));
  }
  const observed = [
    ...entries
      .filter((e) =>
        e.facts.some((f) =>
          ["Medication effect", "What helped"].includes(f.kind),
        ),
      )
      .slice(0, 1),
    ...entries
      .filter((e) =>
        e.facts.some((f) => ["Menstrual context", "Timing"].includes(f.kind)),
      )
      .slice(0, 1),
  ];
  if (observed.length) {
    p.setFont("helvetica", "bold");
    line("Recent context (latest two relevant entries)", 11);
    p.setFont("helvetica", "normal");
    observed.forEach((e) => {
      const f =
        e.facts.find((f) =>
          ["Medication effect", "What helped"].includes(f.kind),
        ) ||
        e.facts.find((f) => ["Menstrual context", "Timing"].includes(f.kind))!;
      line(
        `${e.date}: "${f.quote.slice(0, 180)}${f.quote.length > 180 ? "…" : ""}" [${ref(e.id)}]`,
        9,
      );
    });
  }
  if (questions.length) {
    p.setFont("helvetica", "bold");
    line("Questions for my clinician", 11);
    p.setFont("helvetica", "normal");
    questions.forEach((q) => line(`- ${q}`, 9));
  }
  p.setFont("helvetica", "bold");
  line("Source key: numbered journal entries", 10);
  p.setFont("helvetica", "normal");
  // Three columns keep a month of source references compact and independently traceable.
  p.setFontSize(8);
  entries.forEach((e, i) => {
    if (i % 3 === 0 && y > 268) {
      p.addPage();
      y = 20;
    }
    p.text(`[${i + 1}] ${e.date}`, 18 + (i % 3) * 59, y);
    if (i % 3 === 2 || i === entries.length - 1) y += 4;
  });
  y += 5;
  if (y > 268) {
    // Never silently truncate a larger-than-MVP dataset.
    p.addPage();
    y = 20;
  }
  line(safetyBoundary, 8);
  if (appendix) {
    p.addPage();
    y = 20;
    line("Evidence appendix", 17);
    r.claims.forEach((c) =>
      line(`${c.text} [${c.ids.map(ref).join(", ")}]`, 9),
    );
    r.quotes.forEach((q) => {
      const content = `[${ref(q.id)}] ${q.date} | ${q.kind}: "${q.quote}"`;
      p.setFontSize(9);
      for (const row of p.splitTextToSize(content, 174)) {
        if (y > 278) {
          p.addPage();
          y = 20;
        }
        p.text(row, 18, y);
        y += 4.5;
      }
      y += 3;
    });
  }
  return p;
}

export async function downloadBrief(...args: Parameters<typeof createBrief>) {
  const p = await createBrief(...args);
  p.save("wholestory-appointment-brief.pdf");
}
