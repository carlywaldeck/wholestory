import { riskDaySchema, riskSymptoms, type RiskInput } from "./symptom-risk";
import { validateEntry, type Entry, type Fact } from "./model";
export const checkinSymptoms = [
  { key: "pelvicPain", label: "Pelvic pain / cramps", kind: "Pelvic pain" },
  { key: "fatigue", label: "Fatigue", kind: "Fatigue" },
  { key: "bloating", label: "Bloating", kind: "Bloating" },
  { key: "bowelSymptoms", label: "Bowel symptoms", kind: "Bowel discomfort" },
] as const;
export type ConfirmedDay = RiskInput["days"][number];
export type Answers = Record<typeof checkinSymptoms[number]["key"], boolean | null>;
export const emptyAnswers = (): Answers => ({ pelvicPain: null, fatigue: null, bloating: null, bowelSymptoms: null });
const KEY = "elya-confirmed-checkins-v1";
export function loadConfirmedDays(): ConfirmedDay[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw Error("Saved check-ins could not be read.");
  return parsed.map(day => riskDaySchema.parse(day));
}
export function saveConfirmedDay(day: ConfirmedDay) {
  const days = loadConfirmedDays().filter(d => d.date !== day.date);
  localStorage.setItem(KEY, JSON.stringify([...days, riskDaySchema.parse(day)]));
}
export function forgetConfirmedDay(date: string) {
  localStorage.setItem(KEY, JSON.stringify(loadConfirmedDays().filter(d=>d.date!==date)));
}
export function clearConfirmedDays() { localStorage.removeItem(KEY); }
export function checkinRecord(date: string, answers: Answers, note: string, persona?: "maya" | "alex" | "jules") {
  const symptoms = Object.fromEntries(riskSymptoms.map(s => [s, null]));
  Object.assign(symptoms, answers);
  const day = riskDaySchema.parse({ date, availableAt: new Date().toISOString(), symptoms });
  const facts: Fact[] = [];
  const lines: string[] = [];
  for (const { key, label, kind } of checkinSymptoms) {
    if (answers[key] === null) continue;
    const quote = answers[key] ? `I reported ${label.toLowerCase()} today.` : `I reported no ${label.toLowerCase()} today.`;
    lines.push(quote);
    facts.push({kind, value: answers[key] ? label : "No", quote});
  }
  if (!lines.length && !note.trim()) throw Error("Answer a symptom or add a note before saving.");
  if (note.trim()) lines.push(note.trim());
  const entry: Entry = validateEntry({
    id: `checkin-${persona ?? "personal"}-${date}`, date, text: lines.join(" "),
    facts, symptomFree: false, demo: !!persona, ...(persona ? { persona } : {}),
  });
  return { day, entry };
}
