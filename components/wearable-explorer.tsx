"use client";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Moon,
  ArrowRight,
  Download,
  Upload,
  CalendarDays,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  WearableConnections,
  PublicWearableSample,
} from "./wearable-connections";
import { Entry } from "../lib/model";
import {
  WearableRecord,
  CheckIn,
  loadWearables,
  saveWearables,
  loadCheckIn,
  saveCheckIn,
  parseWearableCSV,
  syntheticWearables,
  summarizeWearables,
  wearableTemplate,
  checkInCalendar,
} from "../lib/wearables";
const localDate = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function WearableExplorer({
  entries,
  demo,
  onDemo,
  onEvidence,
  onInclude,
}: {
  entries: Entry[];
  demo: boolean;
  onDemo: () => void;
  onEvidence: (ids: string[]) => void;
  onInclude: (text: string) => void;
}) {
  const [record, setRecord] = useState<WearableRecord>({
    source: "",
    days: [],
  });
  const [metric, setMetric] = useState<"sleepHours" | "steps">("sleepHours");
  const [provider, setProvider] = useState("Oura export");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<CheckIn | null>(null);
  const [reminder, setReminder] = useState(false);
  const [checkDate, setCheckDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [note, setNote] = useState("");
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    Promise.all([loadWearables(), loadCheckIn()])
      .then(([r, c]) => {
        if (active) {
          setRecord(r);
          setSaved(c);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Local data could not be opened. Check browser storage settings.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const days = demo ? syntheticWearables(entries) : record.days;
  const data = summarizeWearables(entries, days, metric);
  const format = (v: number | null) =>
    v === null
      ? "—"
      : metric === "sleepHours"
        ? `${v.toFixed(1)} h`
        : Math.round(v).toLocaleString();
  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return localDate(d);
  };
  return (
    <section className="wearable-explorer" aria-labelledby="wearable-title">
      <div className="wearable-heading">
        <div>
          <span className="section-kicker">YOUR DAYS, WITH MORE CONTEXT</span>
          <h2 id="wearable-title">What changes on difficult days?</h2>
          <p>
            Your words alongside sleep and movement. A way to look back
            together, not a forecast.
          </p>
        </div>
        <span className={`connection-status ${demo ? "synthetic" : ""}`}>
          {demo ? "Fictional wearable demo" : "No live device connected"}
        </span>
      </div>
      {!days.length ? (
        <div className="wearable-empty">
          <Moon size={27} />
          <h3>Start with a little more context.</h3>
          <p>
            Explore a fictional sleep and activity history, or import your own
            daily export. You never need a wearable to use elya.
          </p>
          <Button className="primary" onClick={onDemo}>
            Explore the wearable demo <ArrowRight size={16} />
          </Button>
        </div>
      ) : (
        <>
          <div className="wearable-provenance">
            <strong>
              {demo
                ? "SYNTHETIC DEMO · Intentionally constructed examples"
                : record.source}
            </strong>
            <span>
              {days.length} daily records · {days[0]?.date} to{" "}
              {days.at(-1)?.date}
            </span>
            <p>
              {demo
                ? "Sleep and step values are fictional and deliberately shaped to illustrate the comparison. This is not evidence that wearables predict symptoms."
                : "Imported measurements stay on this device. elya has not verified their accuracy or completeness."}
            </p>
          </div>
          <div
            className="metric-switch"
            role="group"
            aria-label="Wearable metric"
          >
            <button
              aria-pressed={metric === "sleepHours"}
              onClick={() => setMetric("sleepHours")}
            >
              <Moon size={16} />
              Sleep
            </button>
            <button
              aria-pressed={metric === "steps"}
              onClick={() => setMetric("steps")}
            >
              <Activity size={16} />
              Activity
            </button>
          </div>
          <div className="wearable-comparison">
            <div>
              <span>Days with reported life impact</span>
              <strong>{format(data.impactMean)}</strong>
              <small>{data.impactCount} matched days</small>
            </div>
            <div>
              <span>Explicitly symptom-free days</span>
              <strong>{format(data.freeMean)}</strong>
              <small>{data.freeCount} matched days</small>
            </div>
          </div>
          <p className="comparison-reading">
            {data.sufficient
              ? `In these records, average ${metric === "sleepHours" ? "sleep duration" : "step count"} was ${format(data.impactMean)} on impact days and ${format(data.freeMean)} on explicitly symptom-free days.`
              : "Not enough matched days for a comparison yet. Each group needs at least three days with this measurement."}
          </p>
          <p className="muted">
            Descriptive averages, not a statistical finding or personal
            baseline. {data.excluded} records excluded because this measurement
            or a clear comparison group is missing. Sleep uses the waking date;
            activity uses the same calendar date. This does not tell us what
            happened first or what caused symptoms.
          </p>
          <details className="wearable-evidence">
            <summary>See the days behind this comparison</summary>
            <div className="wearable-table-wrap">
              <table>
                <caption>
                  Measurements and journal reports, aligned by date
                </caption>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>{metric === "sleepHours" ? "Sleep" : "Steps"}</th>
                    <th>Journal context</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paired.map((day) => (
                    <tr key={day.date}>
                      <td>{day.date}</td>
                      <td>{format(day[metric])}</td>
                      <td>
                        {day.ids.length ? (
                          <button
                            className="day-source"
                            onClick={() => onEvidence(day.ids)}
                          >
                            {day.group === "impact"
                              ? "Daily-life impact"
                              : day.group === "free"
                                ? "Explicitly symptom-free"
                                : "Other entry · excluded"}{" "}
                            ↗
                          </button>
                        ) : (
                          "No entry · excluded"
                        )}
                        {day.quotes.map((q, i) => (
                          <small key={`${q.id}-${i}`}>“{q.quote}”</small>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          {data.sufficient && (
            <Button
              onClick={() => {
                const note = `${demo ? "SYNTHETIC DEMO; constructed example. " : "Imported, unverified wearable data. "}${metric === "sleepHours" ? "Sleep duration" : "Step count"}: average ${format(data.impactMean)} across ${data.impactCount} days with reported life impact; ${format(data.freeMean)} across ${data.freeCount} explicitly symptom-free days. Source: ${demo ? "fictional wearable data" : record.source}; ${days[0].date} to ${days.at(-1)!.date}. ${data.excluded} records excluded. Calendar-date comparison only; this does not establish cause, predict symptoms, or validate pain.`;
                onInclude(note);
              }}
            >
              Use this comparison in my brief <ArrowRight size={15} />
            </Button>
          )}
          <div className="wearable-next">
            <div>
              <h3>A pattern you want to check again?</h3>
              <p>
                Choose a check-in for yourself. We won’t infer an upcoming flare
                or send an automatic alert.
              </p>
            </div>
            <Button
              onClick={() => {
                setReminder(true);
                setCheckDate(saved?.date || tomorrow());
                setTime(saved?.time || "09:00");
                setNote(saved?.note || "");
              }}
            >
              Plan a check-in <CalendarDays size={16} />
            </Button>
          </div>
        </>
      )}
      {!demo && (
        <WearableConnections
          onImported={async (value) => {
            await saveWearables(value);
            setRecord(value);
            onInclude("");
            setError("");
          }}
        />
      )}
      <PublicWearableSample />
      {!demo && (
        <details className="wearable-import">
          <summary>Import sleep & activity</summary>
          <p>
            Use a daily CSV with <code>date,sleep_hours,steps</code>. Convert
            your device export to this template first; this is not an automatic
            device sync. Assign sleep to the date you woke up, using the same
            local dates as your journal. Leave unavailable values blank.
          </p>
          <label>
            Source label
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option>Oura export</option>
              <option>Fitbit export</option>
              <option>Apple Health export</option>
              <option>Garmin export</option>
              <option>Other daily export</option>
            </select>
          </label>
          <div className="toolbar">
            <Button
              onClick={() =>
                download(
                  wearableTemplate,
                  "elya-wearable-template.csv",
                  "text/csv",
                )
              }
            >
              <Download size={15} />
              Download CSV template
            </Button>
            <Button disabled={!ready} onClick={() => file.current?.click()}>
              <Upload size={15} />
              Choose CSV
            </Button>
          </div>
          <input
            ref={file}
            hidden
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                if (f.size > 1000000)
                  throw Error("Choose a CSV smaller than 1 MB.");
                const imported = parseWearableCSV(await f.text());
                const value = { source: provider, days: imported };
                await saveWearables(value);
                setRecord(value);
                onInclude("");
                setError("");
                setMessage(
                  `Imported ${imported.length} daily records. This replaces your previous wearable import; journal entries are unchanged.`,
                );
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          />
          <p className="muted">
            Files are read locally, not uploaded or sent to AI. Import replaces
            the previous wearable dataset. Live OAuth device connections are not
            available in this version.
          </p>
          {record.days.length > 0 && (
            <Button
              onClick={() =>
                download(
                  JSON.stringify(record, null, 2),
                  "elya-wearable-data.json",
                  "application/json",
                )
              }
            >
              Export wearable records
            </Button>
          )}
        </details>
      )}
      {reminder && (
        <form
          className="checkin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const value = { date: checkDate, time, note: note.trim() };
              checkInCalendar(value);
              await saveCheckIn(value);
              setSaved(value);
              setReminder(false);
              setMessage(
                "Check-in saved on this device. Download the calendar file if you want a calendar reminder.",
              );
              setError("");
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <h3>Your next check-in</h3>
          <div className="checkin-fields">
            <label>
              Date
              <input
                type="date"
                required
                min={localDate()}
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
              />
            </label>
            <label>
              Local time
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          </div>
          <label>
            What would you like to notice?{" "}
            <span className="muted">Optional · stays here</span>
            <input
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="For example: how rested I feel tomorrow"
            />
          </label>
          <div className="toolbar">
            <Button type="submit" className="primary">
              Save check-in
            </Button>
            <Button type="button" onClick={() => setReminder(false)}>
              Cancel
            </Button>
          </div>
          <p className="muted">
            This app does not send notifications. Calendar downloads contain
            only a generic “Personal check-in,” not your health notes.
          </p>
        </form>
      )}
      {saved && (
        <div className="saved-checkin">
          <span className="section-kicker">
            {demo
              ? "YOUR LOCAL CHECK-IN · NOT PART OF THE DEMO"
              : "YOUR NEXT CHECK-IN"}
          </span>
          <h3>
            {saved.date} at {saved.time}
          </h3>
          {saved.note && <p>{saved.note}</p>}
          <div className="toolbar">
            <Button
              onClick={() =>
                download(
                  checkInCalendar(saved),
                  "personal-check-in.ics",
                  "text/calendar",
                )
              }
            >
              <Download size={15} />
              Download calendar event
            </Button>
            <Button
              onClick={async () => {
                try {
                  await saveCheckIn(null);
                  setSaved(null);
                  setMessage("Check-in removed.");
                } catch {
                  setError("Could not remove check-in. Please try again.");
                }
              }}
            >
              Remove check-in
            </Button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="wearable-message">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p className="wearable-boundary">
        Your experience matters even when your wearable looks normal. These
        observations neither diagnose a condition nor validate or invalidate
        pain. They should not guide medication changes or delay care.
      </p>
    </section>
  );
}
