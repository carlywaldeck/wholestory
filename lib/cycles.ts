import { type Entry, isPresentFact } from "./model";
export function explicitScore(value: string | undefined) {
  if (!value || !/^(10|[0-9])(?:\/10)?$/.test(value.trim())) return null;
  return Number(value.split("/")[0]);
}
export function cycleContext(e: Entry) {
  const start = e.facts.find((f) => f.kind === "Cycle start")?.value;
  const value = e.facts.find((f) => f.kind === "Cycle day")?.value;
  const day =
    value && /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 120
      ? Number(value)
      : null;
  return {
    start: start || null,
    day,
    score: explicitScore(e.facts.find((f) => f.kind === "Severity")?.value),
  };
}
export function cycleAnalysis(entries: Entry[]) {
  const known = entries.filter((e) => {
    const c = cycleContext(e);
    return c.start && c.day;
  });
  const starts = [...new Set(known.map((e) => cycleContext(e).start!))].sort();
  const cycles = starts.map((start) => {
    const es = known.filter((e) => cycleContext(e).start === start);
    const pain = es.filter(
      (e) =>
        e.facts.some(
          (f) => ["Pelvic pain", "Pain"].includes(f.kind) && isPresentFact(f),
        ) || (cycleContext(e).score ?? 0) > 0,
    );
    return {
      start,
      loggedDays: new Set(es.map((e) => e.date)).size,
      painDays: new Set(pain.map((e) => e.date)).size,
      ids: es.map((e) => e.id),
    };
  });
  const max = Math.max(1, ...known.map((e) => cycleContext(e).day!));
  const plot = Array.from({ length: max }, (_, i) => {
    const row: Record<string, number | null> = { day: i + 1 };
    for (const start of starts.slice(-4)) {
      const scores = known
        .filter((e) => {
          const c = cycleContext(e);
          return c.start === start && c.day === i + 1;
        })
        .map((e) => cycleContext(e).score)
        .filter((v): v is number => v !== null);
      row[start] = scores.length ? Math.max(...scores) : null;
    }
    return row;
  });
  const recurring = Array.from({ length: max }, (_, i) => i + 1).flatMap(
    (day) => {
      const es = known.filter((e) => {
        const c = cycleContext(e);
        return (
          c.day === day &&
          ((c.score ?? 0) > 0 ||
            e.facts.some(
              (f) =>
                ["Pain", "Pelvic pain"].includes(f.kind) && isPresentFact(f),
            ))
        );
      });
      const count = new Set(es.map((e) => cycleContext(e).start)).size;
      return count >= 2
        ? [
            {
              day,
              cycles: count,
              ids: es.map((e) => e.id),
              text: `Pain was reported on cycle day ${day} in ${count} documented cycles.`,
            },
          ]
        : [];
    },
  );
  return {
    cycles,
    plot,
    starts: starts.slice(-4),
    recurring,
    unknownDays: new Set(
      entries.filter((e) => !known.includes(e)).map((e) => e.date),
    ).size,
  };
}
export function appointmentQuestions(entries: Entry[]) {
  const kinds = new Set(entries.flatMap((e) => e.facts.map((f) => f.kind)));
  return [
    "What could explain these symptoms?",
    "What should I track before our next visit?",
    "What evaluation options can we discuss?",
    ...(kinds.has("Daily-life impact")
      ? [
          "How can we address the effect on my work, school, or daily activities?",
        ]
      : []),
    ...(kinds.has("Bowel discomfort") || kinds.has("Pain with bowel movements")
      ? ["Could we discuss the pain or discomfort with bowel movements?"]
      : []),
    ...(kinds.has("Pain during sex")
      ? ["How can we evaluate the pain I experience during sex?"]
      : []),
    ...(kinds.has("Intervention")
      ? [
          "How should I record whether an intervention helps or causes side effects?",
        ]
      : []),
  ];
}
