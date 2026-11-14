import { z } from "zod";
import { openDB } from "idb";
import { classifyJournalDay } from "./wearable-labels";
import { Entry, isPresentFact } from "./model";

// Calendar-date alignment: sleep belongs to its waking date, not the previous evening.
export const wearableDaySchema = z
  .object({
    date: z.iso.date(),
    sleepHours: z.number().min(0).max(24).nullable(),
    steps: z.number().int().min(0).max(150000).nullable(),
  })
  .strict();
export type WearableDay = z.infer<typeof wearableDaySchema>;
export type WearableRecord = { source: string; days: WearableDay[] };
export function validateWearableDays(input: unknown): WearableDay[] {
  const days = z.array(wearableDaySchema).max(3660).parse(input);
  const seen = new Set<string>();
  for (const day of days) {
    if (seen.has(day.date)) throw Error(`Duplicate wearable date: ${day.date}`);
    seen.add(day.date);
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}
export function validateWearableRecord(input: WearableRecord): WearableRecord {
  return {
    source: z.string().trim().max(60).parse(input.source),
    days: validateWearableDays(input.days),
  };
}
export type CheckIn = { date: string; time: string; note: string };
const empty: WearableRecord = { source: "", days: [] };
async function database() {
  return openDB("wholestory-wearables", 1, {
    upgrade(db) {
      db.createObjectStore("data");
    },
  });
}
export async function loadWearables(): Promise<WearableRecord> {
  const db = await database();
  try {
    const value = await db.get("data", "wearables");
    return value
      ? {
          source: z.string().max(60).parse(value.source),
          days: validateWearableDays(value.days),
        }
      : empty;
  } finally {
    db.close();
  }
}
export async function saveWearables(value: WearableRecord) {
  const validated = validateWearableRecord(value);
  const db = await database();
  try {
    await db.put("data", validated, "wearables");
  } finally {
    db.close();
  }
}
export async function loadCheckIn(): Promise<CheckIn | null> {
  const db = await database();
  try {
    return (await db.get("data", "checkIn")) || null;
  } finally {
    db.close();
  }
}
export async function saveCheckIn(value: CheckIn | null) {
  const db = await database();
  try {
    await db.put("data", value, "checkIn");
  } finally {
    db.close();
  }
}
export async function clearWearables() {
  const db = await database();
  try {
    await db.clear("data");
  } finally {
    db.close();
  }
}
export const wearableTemplate =
  "date,sleep_hours,steps\n2026-11-01,7.5,6500\n2026-11-02,,4100\n";
export function parseWearableCSV(text: string): WearableDay[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);
  if (lines.shift()?.trim() !== "date,sleep_hours,steps")
    throw Error(
      "Use the template columns: date,sleep_hours,steps. Sleep is assigned to the date you woke up.",
    );
  if (!lines.length || lines.length > 3660)
    throw Error("Import between 1 and 3,660 daily rows.");
  const seen = new Set<string>();
  const days = lines.map((line, i) => {
    const cells = line.split(",").map((cell) => cell.trim());
    if (cells.length !== 3)
      throw Error(`Row ${i + 2}: use exactly three columns.`);
    const numeric = (s: string) =>
      s === "" ? null : /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
    const parsed = wearableDaySchema.safeParse({
      date: cells[0],
      sleepHours: numeric(cells[1]),
      steps: numeric(cells[2]),
    });
    if (
      !parsed.success ||
      (parsed.data.sleepHours === null && parsed.data.steps === null)
    )
      throw Error(
        `Row ${i + 2}: check the date, sleep hours (0–24), and whole-number steps. Leave missing values blank.`,
      );
    if (seen.has(parsed.data.date))
      throw Error(`Duplicate date: ${parsed.data.date}. Use one row per day.`);
    seen.add(parsed.data.date);
    return parsed.data;
  });
  return days.sort((a, b) => a.date.localeCompare(b.date));
}
export function syntheticWearables(entries: Entry[]): WearableDay[] {
  // Deliberately hand-shaped demonstration, NOT a learned relationship or validation data.
  return [...new Set(entries.filter((e) => e.demo).map((e) => e.date))]
    .sort()
    .map((date, i) => {
      const impact = entries.some(
        (e) =>
          e.date === date &&
          e.facts.some(
            (f) => f.kind === "Daily-life impact" && isPresentFact(f),
          ),
      );
      return {
        date,
        sleepHours:
          i % 11 === 0
            ? null
            : Math.round(
                (impact ? 5.6 + (i % 3) * 0.3 : 7.1 + (i % 4) * 0.2) * 10,
              ) / 10,
        steps:
          i % 9 === 0
            ? null
            : impact
              ? 2100 + (i % 3) * 450
              : 5800 + (i % 5) * 450,
      };
    });
}
export function pairDays(entries: Entry[], days: WearableDay[]) {
  return validateWearableDays(days).map((day) => {
    const es = entries.filter((e) => e.date === day.date);
    const label = classifyJournalDay(es);
    return {
      ...day,
      group:
        label === "impact"
          ? ("impact" as const)
          : label === "symptom-free"
            ? ("free" as const)
            : ("unknown" as const),
      exclusionReason:
        label === "conflicting"
          ? "Conflicting journal reports"
          : label === "unknown"
            ? "No explicit comparison label"
            : null,
      ids: es.map((e) => e.id),
      quotes: es.flatMap((e) =>
        e.facts
          .filter((f) => f.kind === "Daily-life impact" && isPresentFact(f))
          .map((f) => ({ id: e.id, quote: f.quote })),
      ),
    };
  });
}
export function summarizeWearables(
  entries: Entry[],
  days: WearableDay[],
  metric: "sleepHours" | "steps",
) {
  const paired = pairDays(entries, days);
  const values = (group: "impact" | "free") =>
    paired
      .filter((d) => d.group === group && d[metric] !== null)
      .map((d) => d[metric] as number);
  const impact = values("impact"),
    free = values("free");
  const mean = (v: number[]) =>
    v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  return {
    paired,
    impactCount: impact.length,
    freeCount: free.length,
    impactMean: mean(impact),
    freeMean: mean(free),
    sufficient: impact.length >= 3 && free.length >= 3,
    excluded: paired.filter((d) => d.group === "unknown" || d[metric] === null)
      .length,
  };
}
export function checkInCalendar(value: CheckIn) {
  if (
    !z.iso.date().safeParse(value.date).success ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)
  )
    throw Error("Choose a valid date and time.");
  const start = new Date(`${value.date}T${value.time}:00`);
  const end = new Date(start.getTime() + 10 * 60 * 1000);
  const stamp = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  // Generic calendar text avoids exporting symptom notes to a third-party calendar.
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Elya//Check-in//EN",
    "BEGIN:VEVENT",
    `UID:wholestory-${value.date}-${value.time.replace(":", "")}@local`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    "SUMMARY:Personal check-in",
    "DESCRIPTION:Take a moment to check in with yourself.",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
