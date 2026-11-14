"use client";
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  FileText,
  PenLine,
  LockKeyhole,
  Plus,
  ShieldCheck,
  X,
  Trash2,
  Download,
  Settings,
  Check,
  CalendarDays,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "../components/ui/button";
import {
  categories,
  factKinds,
  Entry,
  Fact,
  insights,
  manualExtraction,
  report,
  validateEntry,
} from "../lib/model";
import * as storage from "../lib/storage";
import { personas, personaEntries, PersonaId } from "../lib/demo";
import { StructuredDetails } from "../components/structured-details";
import { WearableExplorer } from "../components/wearable-explorer";
import { clearWearables } from "../lib/wearables";
import { CycleInsights } from "../components/cycle-insights";
import { SafetySection } from "../components/safety-section";
import { safetyBoundary } from "../lib/clinical-context";
import { appointmentQuestions, cycleContext } from "../lib/cycles";
import { useSpokenReplies } from "../hooks/use-spoken-replies";
import { VoicePicker } from "../components/voice-picker";
import { PersonalPreferences } from "../components/personal-preferences";
import {
  defaultPreferences,
  loadPreferences,
  savePreferences,
  clearPreferences,
  type Preferences,
} from "../lib/preferences";
const BRAND = "WholeStory";
const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};
export default function Home() {
  const speech = useSpokenReplies();
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);
  const [showWelcome, setShowWelcome] = useState(false);
  const [wearableNote, setWearableNote] = useState("");
  useEffect(() => {
    let active = true;
    loadPreferences()
      .then((p) => {
        if (active) {
          setPreferences(p);
          setShowWelcome(!p.setupComplete);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  async function updatePreferences(value: Preferences) {
    await savePreferences(value);
    setPreferences(value);
    setShowWelcome(false);
  }
  const [persona, setPersona] = useState<PersonaId>("maya");
  const [customQuestion, setCustomQuestion] = useState("");
  const [entryMode, setEntryMode] = useState<"write" | "voice">("write");
  const [voiceTarget, setVoiceTarget] = useState<"entry" | "answer">("entry");
  const [allEntries, setEntries] = useState<Entry[]>([]),
    [demoMode, setDemoMode] = useState(false),
    [view, setView] = useState("Today"),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [editor, setEditor] = useState(false),
    [text, setText] = useState(""),
    [date, setDate] = useState(today()),
    [facts, setFacts] = useState<Fact[]>([]),
    [free, setFree] = useState(false),
    [id, setId] = useState(""),
    [review, setReview] = useState(false),
    [question, setQuestion] = useState<string | null>(null),
    [answer, setAnswer] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false),
    [filter, setFilter] = useState("All symptoms"),
    [evidence, setEvidence] = useState<string[] | null>(null),
    [settings, setSettings] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [appendix, setAppendix] = useState(false),
    [statement, setStatement] = useState(""),
    [questions, setQuestions] = useState<string[]>([]),
    [selected, setSelected] = useState(""),
    [calendar, setCalendar] = useState(false);
  useEffect(() => {
    if (!editor && !settings && !showWelcome) return;
    const previous = document.activeElement as HTMLElement;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeEditor();
        speech.stop();
        setSettings(false);
        if (showWelcome)
          void updatePreferences({ ...preferences, setupComplete: true });
      }
      if (e.key === "Tab") {
        const items = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".modal button:not(:disabled),.modal input:not([hidden]),.modal textarea,.modal select,.modal a,.modal summary",
          ),
        ).filter((el) => {
          const hidden = el.closest("details:not([open])");
          return (
            !hidden || (el.tagName === "SUMMARY" && el.parentElement === hidden)
          );
        });
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    document
      .querySelector<HTMLElement>(
        showWelcome
          ? ".modal input"
          : editor && entryMode === "write"
            ? ".journal-input textarea"
            : ".modal .close",
      )
      ?.focus();
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [editor, settings, showWelcome]);
  const extractionId = useRef(0);
  const recognition = useRef<Recognition | null>(null);
  const file = useRef<HTMLInputElement>(null);
  async function refresh() {
    try {
      setEntries(
        (await storage.loadEntries()).sort((a, b) =>
          b.date.localeCompare(a.date),
        ),
      );
      setReady(true);
    } catch {
      setError(
        "Browser storage is unavailable. Enable local storage to save your journal.",
      );
    }
  }
  useEffect(() => {
    refresh();
    return () => {
      extractionId.current++;
      const r = recognition.current;
      if (r) {
        r.onend = null;
        r.onresult = null;
        r.onerror = null;
        (r.abort || r.stop).call(r);
      }
    };
  }, []);
  useEffect(() => {
    setReviewed(false);
    setWearableNote("");
  }, [allEntries, demoMode, persona]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);
  useEffect(() => {
    if (evidence)
      document
        .getElementById("supporting-entries")
        ?.scrollIntoView({ block: "start" });
  }, [evidence, view]);
  const entries = allEntries.filter((e) =>
    demoMode ? e.demo && e.persona === persona : !e.demo,
  );
  const demo = demoMode;
  const data = insights(entries);
  const brief = report(entries);
  const visible = entries.filter(
    (e) =>
      (!evidence || evidence.includes(e.id)) &&
      (!selected || e.date === selected) &&
      (filter === "All symptoms" || e.facts.some((f) => f.kind === filter)),
  );
  function stopCapture() {
    const r = recognition.current;
    recognition.current = null;
    if (r) {
      r.onresult = null;
      r.onend = null;
      r.onerror = null;
      (r.abort || r.stop).call(r);
    }
    setRecording(false);
  }
  function closeEditor() {
    extractionId.current++;
    setBusy(false);
    stopCapture();
    speech.stop();
    setEditor(false);
  }
  function open(e?: Entry, mode: "write" | "voice" = "write") {
    setEntryMode(mode);
    extractionId.current++;
    setBusy(false);
    stopCapture();
    speech.stop();
    setId(e?.id || "");
    setText(e?.text || "");
    setDate(e?.date || today());
    setFacts(e?.facts || []);
    setFree(e?.symptomFree || false);
    setReview(!!e);
    setQuestion(null);
    setAnswer("");
    setEditor(true);
    setError("");
  }
  async function save() {
    stopCapture();
    try {
      if (!text.trim()) throw Error("Add a few words before saving.");
      const combined =
        text +
        (answer.trim() ? `\nFollow-up: ${question}\n${answer.trim()}` : "");
      await storage.putEntry(
        validateEntry({
          id: id || crypto.randomUUID(),
          date,
          text: combined,
          facts,
          symptomFree: free,
          demo,
          ...(demo ? { persona } : {}),
        }),
      );
      setEditor(false);
      await refresh();
      setNotice("Your entry is saved on this device.");
      speech.speak(
        "Your entry is saved on this device. Thank you for making a little space for yourself today.",
      );
      setReviewed(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function extract() {
    const attempt = ++extractionId.current;
    stopCapture();
    speech.stop();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, consent }),
      });
      const d = await r.json();
      if (attempt !== extractionId.current) return;
      if (!r.ok) throw Error(d.error);
      setFacts(d.facts);
      setFree(d.symptomFree);
      setQuestion(d.followUp);
      setReview(true);
      speech.speak(
        `Your entry is ready to review. ${d.facts.length ? "Please check the details and the quotes below." : "No structured details were found; you can add them manually."} ${d.followUp ? "One optional question. " + d.followUp : "You can save whenever you are ready."}`,
      );
    } catch (e) {
      if (attempt !== extractionId.current) return;
      setError((e as Error).message);
      speech.speak(
        "I could not extract the details. Your words are still here. You can choose Review manually to continue.",
      );
    } finally {
      if (attempt === extractionId.current) setBusy(false);
    }
  }
  function voice() {
    const w = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const R = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!R) {
      open(undefined, "voice");
      setNotice(
        "Speech recognition is unavailable in this browser. You can type your entry and still enable spoken replies.",
      );
      return;
    }
    open(undefined, "voice");
    setNotice(
      "Recording may use your browser’s speech service. Your transcript can be edited before saving.",
    );
  }
  function startMic(target: "entry" | "answer" = "entry") {
    extractionId.current++;
    setBusy(false);
    stopCapture();
    speech.stop();
    const w = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const R = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!R) {
      setNotice(
        "Speech recognition is unavailable here. You can type and still hear spoken replies.",
      );
      if (speech.enabled)
        speech.speak(
          "You can type your entry here, and I can read the reply aloud.",
        );
      return;
    }
    const r = new R();
    const base = target === "entry" ? text : answer;
    let captured = false;
    const spoken = speech.enabled;
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((x) => x[0].transcript)
        .join(" ")
        .trim();
      if (!transcript) return;
      captured = true;
      const value = [base.trim(), transcript].filter(Boolean).join(" ");
      if (target === "answer") setAnswer(value);
      else {
        setText(value);
        setFacts([]);
        setReview(false);
      }
    };
    r.onerror = () => {
      if (recognition.current !== r) return;
      recognition.current = null;
      r.onend = null;
      setRecording(false);
      setError(
        "Microphone unavailable or speech was not recognized. Please try again or type instead.",
      );
    };
    r.onend = () => {
      if (recognition.current !== r) return;
      recognition.current = null;
      setRecording(false);
      if (captured && spoken)
        speech.speak(
          target === "answer"
            ? "I have added your answer. You can review it and save when you are ready."
            : "I have captured your words. You can organize the details if you have consented, or choose Continue to review them yourself.",
          true,
        );
    };
    recognition.current = r;
    setVoiceTarget(target);
    setError("");
    try {
      r.start();
      setRecording(true);
    } catch {
      recognition.current = null;
      setRecording(false);
      setError(
        "The microphone could not start. Please try again or type instead.",
      );
    }
  }
  function reviewManually() {
    extractionId.current++;
    setBusy(false);
    stopCapture();
    speech.stop();
    const q = manualExtraction(text, entries).followUp;
    setReview(true);
    setQuestion(q);
    setNotice(
      "Manual review: no AI extraction was performed. Add only details supported by your words.",
    );
    speech.speak(
      `Your words are ready to review. You can add details manually. ${q ? "One optional question. " + q : "You can save now."}`,
    );
  }

  async function tryDemo(chosen: PersonaId = persona) {
    try {
      await storage.replaceDemoEntries(personaEntries(chosen));
      setPersona(chosen);
      await refresh();
      setDemoMode(true);
      setNotice(
        "Synthetic demo history loaded. Entries added in demo mode are also synthetic; your personal journal stays separate.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function pdf() {
    if (!reviewed) return;
    try {
      const { downloadBrief } = await import("../lib/pdf");
      await downloadBrief(
        entries,
        statement,
        questions,
        appendix,
        BRAND,
        wearableNote,
      );
    } catch {
      setError("The PDF could not be generated. Please try again.");
    }
  }
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="#" onClick={() => setView("Today")}>
          <span className="brand-mark" aria-hidden="true">
            w.
          </span>
          {BRAND}
        </a>
        <div className="navlabel">YOUR JOURNAL</div>
        <nav>
          {[
            ["Today", CalendarDays],
            ["Your story", BookOpen],
            ["Appointment brief", FileText],
          ].map(([label, Icon]) => (
            <button
              className={
                view === label ||
                (label === "Your story" && view === "Insights")
                  ? "active"
                  : ""
              }
              key={String(label)}
              onClick={() => {
                setView(String(label));
                setEvidence(null);
                setSelected("");
              }}
            >
              {typeof Icon !== "string" && <Icon size={20} />}
              <span>{String(label)}</span>
              {view === label && <span className="dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="sidebar-note">
            A record of your days.
            <br />A little less to remember.
          </p>
          <button onClick={() => setSettings(true)}>
            <Settings size={16} /> Privacy & settings
          </button>
          <span>
            <LockKeyhole size={13} /> Kept on this device
          </span>
        </div>
      </aside>
      <main>
        <header>
          <span className="header-location">
            {preferences.name
              ? `${preferences.name}’s journal`
              : "Your journal"}{" "}
            <span>/</span> {view}
          </span>
          {(speech.speaking || speech.preparing) && (
            <button className="stop-reply" onClick={speech.stop}>
              <VolumeX size={14} /> Stop speaking
            </button>
          )}
          <button className="demo-link" onClick={() => tryDemo()}>
            Try demo <ArrowUpRight size={14} />
          </button>
          <button
            className="header-settings"
            aria-label="Privacy settings"
            onClick={() => setSettings(true)}
          >
            <Settings size={18} />
          </button>
        </header>
        {demo && (
          <div className="demo-banner">
            SYNTHETIC DEMO DATA{" "}
            <span>Fictional entries for exploring WholeStory.</span>
            <select
              aria-label="Demo persona"
              value={persona}
              onChange={(e) => {
                setEvidence(null);
                setSelected("");
                setQuestions([]);
                setStatement("");
                setReviewed(false);
                tryDemo(e.target.value as PersonaId);
              }}
            >
              {personas.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name} · {p.description}
                </option>
              ))}
            </select>
            <button
              onClick={async () => {
                setDemoMode(false);
                setNotice(
                  "Back to your personal journal. Demo entries are kept separately.",
                );
              }}
            >
              Exit demo
            </button>
          </div>
        )}
        {notice && (
          <div role="status" className="notice">
            {notice}
            <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
              <X size={15} />
            </button>
          </div>
        )}
        {error && !editor && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {view === "Today" ? (
          <>
            <section className="intro">
              <div className="eyebrow">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <h1>
                How are you feeling <em>today?</em>
              </h1>
              <p>
                A place for what you feel, and how it shapes your day.
                <br className="desktop-break" /> Small details are welcome here.
              </p>
            </section>
            <section className="capture">
              <div className="capture-copy">
                <span className="section-kicker">A NEW ENTRY</span>
                <h2>Start with a moment.</h2>
                <p>
                  Talk it through or write it down.
                  <br />
                  You can check everything before you save.
                </p>
              </div>
              <div className="capture-actions">
                <button
                  className="mic"
                  aria-label={
                    preferences.inputMode === "write"
                      ? "Write an entry"
                      : "Record a moment"
                  }
                  onClick={() =>
                    preferences.inputMode === "write" ? open() : voice()
                  }
                >
                  {preferences.inputMode === "write" ? (
                    <PenLine size={20} />
                  ) : (
                    <Mic size={20} />
                  )}
                  <span>
                    {preferences.inputMode === "write"
                      ? "Write an entry"
                      : "Record a moment"}
                  </span>
                  <ArrowRight size={17} />
                </button>
                <button
                  className="type-link"
                  aria-label={
                    preferences.inputMode === "write"
                      ? "Record instead"
                      : "Write instead"
                  }
                  onClick={() =>
                    preferences.inputMode === "write" ? voice() : open()
                  }
                >
                  {preferences.inputMode === "write" ? (
                    <Mic size={17} />
                  ) : (
                    <PenLine size={17} />
                  )}{" "}
                  {preferences.inputMode === "write"
                    ? "Record instead"
                    : "Write instead"}{" "}
                  <ArrowRight size={15} />
                </button>
                <div className="capture-note">
                  <LockKeyhole size={12} /> Saved in your browser. No account
                  needed.
                </div>
              </div>
            </section>
            {entries.length > 0 && (
              <section className="next-step">
                <div>
                  <span className="section-kicker">
                    YOUR WORDS, READY TO BE HEARD
                  </span>
                  <h2>A little less to carry into your appointment.</h2>
                  <p>
                    Bring together what happened, how it affected your days, and
                    what you want to ask. Every observation links back to your
                    entries.
                  </p>
                </div>
                <Button onClick={() => setView("Appointment brief")}>
                  Prepare your brief <ArrowRight size={16} />
                </Button>
              </section>
            )}
            <button
              className="pattern-home-link"
              onClick={() => setView("Insights")}
            >
              <span>Sleep, movement & your experience</span>
              <strong>
                Explore what changes on difficult days <ArrowRight size={16} />
              </strong>
              <span>
                Start with a fictional wearable demo, or import a daily export.
              </span>
            </button>
            <section className="recent">
              <div className="section-heading">
                <h2>
                  Your recent entries <span>{entries.length}</span>
                </h2>
                <button onClick={() => setView("Your story")}>
                  View your story <ArrowRight size={15} />
                </button>
              </div>
              {!entries.length ? (
                <div className="empty">
                  <div className="empty-icon">
                    <BookOpen size={23} />
                  </div>
                  <p>Your first page is waiting.</p>
                  <span>
                    You don’t need the right words. Just start with today.
                  </span>
                  <Button onClick={() => tryDemo()}>
                    Explore a sample journal <ArrowRight size={15} />
                  </Button>
                </div>
              ) : (
                entries.slice(0, 3).map((e) => entryCard(e))
              )}
            </section>
          </>
        ) : view === "Your story" ? (
          <>
            <section className="page-title">
              <div className="eyebrow">YOUR JOURNAL</div>
              <h1>Your story</h1>
              <p>A record of what you felt, and what it meant for your day.</p>
            </section>
            <div className="toolbar">
              <select
                aria-label="Filter symptoms"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option>All symptoms</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <Button onClick={() => setView("Insights")}>
                <ChartNoAxesCombined size={17} /> See patterns
              </Button>
              <Button onClick={() => setCalendar(!calendar)}>
                <CalendarDays size={17} /> Calendar
              </Button>
              <Button className="primary" onClick={() => open()}>
                <Plus size={17} /> Add entry
              </Button>
            </div>
            {calendar && (
              <section className="calendar">
                <p>
                  Last 30 days · ● symptoms · ○ explicitly symptom-free · —
                  unlogged
                </p>
                <div>
                  {Array.from({ length: 30 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - 29 + i);
                    const day = new Date(
                      d.getTime() - d.getTimezoneOffset() * 60000,
                    )
                      .toISOString()
                      .slice(0, 10);
                    const es = entries.filter((e) => e.date === day);
                    return (
                      <button
                        key={day}
                        className={es.length ? "logged" : ""}
                        aria-label={`${day}: ${es.length ? (es.every((e) => e.symptomFree) ? "symptom-free" : "logged") : "unlogged"}`}
                        onClick={() => setSelected(selected === day ? "" : day)}
                      >
                        {d.getDate()}
                        <span>
                          {es.length
                            ? es.every((e) => e.symptomFree)
                              ? "○"
                              : "●"
                            : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            {selected && (
              <button onClick={() => setSelected("")}>
                Clear date filter: {selected} ×
              </button>
            )}
            {visible.map((e) => entryCard(e))}
            {!visible.length && (
              <div className="empty">No entries here yet.</div>
            )}
          </>
        ) : view === "Insights" ? (
          <>
            <section className="page-title">
              <div className="eyebrow">LOOKING BACK</div>
              <button
                className="back-link"
                onClick={() => setView("Your story")}
              >
                ← Your story
              </button>
              <h1>Your days, connected.</h1>
              <p>
                Bring together what you feel and what your wearable records.
              </p>
            </section>
            <WearableExplorer
              entries={entries}
              demo={demo}
              onDemo={() => tryDemo()}
              onEvidence={setEvidence}
              onInclude={(text) => {
                setWearableNote(text);
                setReviewed(false);
                if (text) setView("Appointment brief");
              }}
            />
            <details className="existing-patterns">
              <summary>Explore symptoms & cycle patterns</summary>
              <div className="stats">
                <div>
                  <strong>{data.logged}</strong>
                  <span>logged days</span>
                </div>
                <div>
                  <strong>{data.free}</strong>
                  <span>explicitly symptom-free days</span>
                </div>
                <div>
                  <strong>
                    {data.items.find((i) => i.kind === "Daily-life impact")
                      ?.days || 0}
                  </strong>
                  <span>days with daily-life impact</span>
                </div>
              </div>
              <p className="muted">
                Based only on your logged days. Missing logs are unknown.{" "}
                {data.logged < 30
                  ? "This is a small sample; patterns may change as you log more."
                  : ""}{" "}
                Counts do not establish a cause.
              </p>
              <CycleInsights entries={entries} onEvidence={setEvidence} />
              <section className="chart-card">
                <h2>What you’ve mentioned</h2>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(
                    180,
                    data.items.filter((i) => i.days).length * 34,
                  )}
                >
                  <BarChart
                    layout="vertical"
                    data={data.items.filter((i) => i.days)}
                  >
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="kind"
                      tick={{ fontSize: 10 }}
                      width={135}
                    />
                    <Tooltip />
                    <Bar dataKey="days" fill="#b97191" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </section>
              {data.items
                .filter((i) => i.days)
                .map((i) => (
                  <button
                    key={i.kind}
                    className="insight-row"
                    onClick={() => setEvidence(i.ids)}
                  >
                    <span>
                      <strong>{i.kind}</strong> was reported on {i.days} logged{" "}
                      {i.days === 1 ? "day" : "days"}.
                    </span>
                    <span>
                      See evidence <ArrowUpRight size={16} />
                    </span>
                  </button>
                ))}
            </details>
            {evidence && (
              <section id="supporting-entries">
                <div className="section-heading">
                  <h2>Supporting entries</h2>
                  <button onClick={() => setEvidence(null)}>
                    Close <X size={16} />
                  </button>
                </div>
                {visible.map((e) => entryCard(e))}
              </section>
            )}
          </>
        ) : (
          <>
            <section className="page-title">
              <div className="eyebrow">APPOINTMENT PREPARATION</div>
              <h1>A clearer conversation.</h1>
              <p>Gather the details you want your clinician to understand.</p>
            </section>
            {!entries.length ? (
              <section className="brief-empty">
                <span className="section-kicker">
                  START WITH YOUR EXPERIENCE
                </span>
                <h2>Your words come first.</h2>
                <p>
                  Add an entry about what you felt and what it changed about
                  your day. Then we’ll bring your notes together into a brief
                  you can review and share.
                </p>
                <Button className="primary" onClick={() => open()}>
                  Write your first entry <ArrowRight size={16} />
                </Button>
                <button className="back-link" onClick={() => tryDemo()}>
                  Explore a fictional example
                </button>
              </section>
            ) : (
              <section className="report">
                <div className="section-kicker">
                  <BookOpen /> {BRAND} / PATIENT-REPORTED SUMMARY
                </div>
                {demo && <b>SYNTHETIC DEMO DATA</b>}
                <h2>Appointment brief</h2>
                <p>
                  {brief.range} · {brief.logged} logged days
                </p>
                <p className="muted">
                  Unlogged days are unknown. Counts describe reports, not a
                  diagnosis.
                </p>
                <div className="appointment-priority">
                  <span className="section-kicker">
                    START WITH WHAT YOU WANT HEARD
                  </span>
                  <label>
                    What matters most for this appointment
                    <textarea
                      maxLength={600}
                      value={statement}
                      onChange={(e) => {
                        setStatement(e.target.value);
                        setReviewed(false);
                      }}
                      placeholder="For example: I’m missing work every month, and I want help finding a plan that lets me get through my day."
                    />
                  </label>
                  <p className="muted">
                    Your words, included at the start of your downloaded brief.
                  </p>
                </div>
                {wearableNote && (
                  <section className="wearable-brief-note">
                    <h3>Wearable context · chosen by you</h3>
                    <p>{wearableNote}</p>
                    <Button
                      onClick={() => {
                        setWearableNote("");
                        setReviewed(false);
                      }}
                    >
                      Remove wearable comparison
                    </Button>
                  </section>
                )}
                <h3>What your entries tell us</h3>
                {brief.claims.map((c) => (
                  <p key={c.kind}>
                    <button
                      className="claim"
                      onClick={() => {
                        setEvidence(c.ids);
                        setView("Insights");
                      }}
                    >
                      {c.text} <ArrowUpRight size={13} />
                    </button>
                  </p>
                ))}
                {!brief.claims.length && (
                  <p>No structured symptoms reported yet.</p>
                )}
                {brief.patterns.length > 0 && (
                  <>
                    <h3>Recurring observations</h3>
                    {brief.patterns.map((p) => (
                      <p key={p.day}>
                        <button
                          className="claim"
                          onClick={() => {
                            setEvidence(p.ids);
                            setView("Insights");
                          }}
                        >
                          {p.text} ↗
                        </button>
                      </p>
                    ))}
                    <p className="muted">
                      A description of logged experiences, not a cause or
                      prediction.
                    </p>
                  </>
                )}
                <h3>Menstrual context & observations</h3>
                {entries
                  .filter((e) =>
                    e.facts.some((f) =>
                      [
                        "Menstrual context",
                        "What helped",
                        "Timing",
                        "Intervention",
                        "Medication effect",
                      ].includes(f.kind),
                    ),
                  )
                  .slice(0, 4)
                  .map((e) => (
                    <p key={e.id}>
                      <button
                        className="claim"
                        onClick={() => {
                          setEvidence([e.id]);
                          setView("Insights");
                        }}
                      >
                        {e.date}:{" "}
                        {e.facts
                          .filter((f) =>
                            [
                              "Menstrual context",
                              "What helped",
                              "Timing",
                              "Intervention",
                              "Medication effect",
                            ].includes(f.kind),
                          )
                          .map((f) => `“${f.quote}”`)
                          .join(" ")}{" "}
                        ↗
                      </button>
                    </p>
                  ))}
                <h3>Questions for your clinician</h3>
                {[
                  ...new Set([...appointmentQuestions(entries), ...questions]),
                ].map((q) => (
                  <label className="checkbox" key={q}>
                    <input
                      type="checkbox"
                      checked={questions.includes(q)}
                      onChange={(e) => {
                        setQuestions(
                          e.target.checked
                            ? [...questions, q]
                            : questions.filter((x) => x !== q),
                        );
                        setReviewed(false);
                      }}
                    />
                    {q}
                  </label>
                ))}
                <div className="custom-question">
                  <label>
                    Add your own question
                    <input
                      maxLength={150}
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      placeholder="What would you like to ask?"
                    />
                  </label>
                  <Button
                    disabled={!customQuestion.trim()}
                    onClick={() => {
                      setQuestions([
                        ...new Set([...questions, customQuestion.trim()]),
                      ]);
                      setCustomQuestion("");
                      setReviewed(false);
                    }}
                  >
                    Add question
                  </Button>
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={appendix}
                    onChange={(e) => setAppendix(e.target.checked)}
                  />{" "}
                  Include dated evidence appendix
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />{" "}
                  I have reviewed this brief and the supporting entries for
                  accuracy.
                </label>
                <Button
                  disabled={!reviewed || !entries.length}
                  className="primary"
                  onClick={pdf}
                >
                  <Download size={16} /> Download PDF
                </Button>
                <Button
                  disabled={!reviewed || !entries.length}
                  onClick={() => window.print()}
                >
                  Print
                </Button>
                <p className="muted">
                  Edit source entries in Your story to correct report claims.
                  Your statement is labeled as user authored.
                </p>
              </section>
            )}
          </>
        )}
        <SafetySection />
        <footer>
          <span>
            <span className="footer-wordmark">WholeStory</span>{" "}
            <span>A little less to remember.</span>
          </span>
          <p>{safetyBoundary}</p>
        </footer>
      </main>
      {showWelcome && (
        <div className="overlay">
          <section
            className="modal welcome-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
          >
            <div className="brand welcome-brand">
              <span className="brand-mark" aria-hidden="true">
                w.
              </span>
              WholeStory
            </div>
            <div className="eyebrow">A SPACE OF YOUR OWN</div>
            <h2 id="welcome-title">
              Welcome to
              <br />
              <em>your next page.</em>
            </h2>
            <p>
              A few small preferences, then you’re ready. Your journal stays in
              this browser.
            </p>
            <PersonalPreferences
              value={preferences}
              onSave={updatePreferences}
              onboarding
            />
          </section>
        </div>
      )}
      {editor && (
        <div className="overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-title"
          >
            <button
              className="close"
              aria-label="Close editor"
              onClick={closeEditor}
            >
              <X />
            </button>
            <div className="eyebrow">
              {review ? "CHECK THE DETAILS" : "YOUR JOURNAL"}
            </div>
            <h2 id="entry-title">
              {review ? "Review your entry." : "Today, in your words."}
            </h2>
            {!review && (
              <div className="entry-tabs">
                <button
                  aria-pressed={entryMode === "write"}
                  onClick={() => {
                    stopCapture();
                    speech.stop();
                    setEntryMode("write");
                  }}
                >
                  <PenLine size={16} /> Write
                </button>
                <button
                  aria-pressed={entryMode === "voice"}
                  onClick={() => {
                    stopCapture();
                    speech.stop();
                    setEntryMode("voice");
                  }}
                >
                  <Mic size={16} /> Record
                </button>
              </div>
            )}
            <label className="entry-date">
              Entry date
              <input
                type="date"
                max={today()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            {entryMode === "voice" && (
              <div className="voice-panel">
                <div className="toolbar">
                  <Button
                    className="primary"
                    onClick={() =>
                      recording
                        ? recognition.current?.stop()
                        : startMic(review && question ? "answer" : "entry")
                    }
                  >
                    {recording ? <Square size={16} /> : <Mic size={16} />}{" "}
                    {recording ? "Stop recording" : "Start recording"}
                  </Button>
                  {(speech.speaking || speech.preparing) && (
                    <Button onClick={speech.stop}>
                      <VolumeX size={16} /> Stop speaking
                    </Button>
                  )}
                </div>
                <p className="muted">
                  Recording uses browser speech recognition, which may use an
                  external service. Spoken replies are optional. The microphone
                  is off while a reply or preview plays; we do not save raw
                  audio.
                </p>
                <div className="voice-status" role="status">
                  {recording
                    ? `Listening to your ${voiceTarget === "answer" ? "follow-up answer" : "entry"}…`
                    : speech.preparing
                      ? "Preparing natural voice…"
                      : speech.speaking
                        ? "Speaking…"
                        : speech.enabled
                          ? "Natural replies on · Microphone off"
                          : "Microphone off"}
                </div>
                {speech.speechError && (
                  <p role="status" className="muted">
                    {speech.speechError}
                  </p>
                )}
              </div>
            )}
            <label className="journal-input">
              Your words
              <textarea
                autoFocus={entryMode === "write"}
                value={text}
                onChange={(e) => {
                  extractionId.current++;
                  setBusy(false);
                  stopCapture();
                  speech.stop();
                  setText(e.target.value);
                  setFacts([]);
                  setReview(false);
                }}
                placeholder="What happened today? How did it feel, and what did it change about your day?"
              />
            </label>
            <StructuredDetails
              date={date}
              onAdd={(added, source) => {
                extractionId.current++;
                setBusy(false);
                stopCapture();
                speech.stop();
                const combined = [text.trim(), source]
                  .filter(Boolean)
                  .join("\n");
                setText(combined);
                setFacts([...facts, ...added]);
                setFree(false);
                setReview(true);
                const q = manualExtraction(combined, entries).followUp;
                setQuestion(q);
                setNotice(
                  "These structured details came from your form. No AI extraction was performed.",
                );
                speech.speak(
                  `Your details are ready to review. ${q ? "One optional question. " + q : "You can save now."}`,
                );
              }}
            />
            {!review ? (
              <>
                <details className="organize-option">
                  <summary>
                    Let AI help organize your words <ArrowRight size={14} />
                  </summary>
                  <p>
                    Turn your entry into editable details with the exact words
                    behind each one. You decide what stays.
                  </p>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />{" "}
                    Send this entry text to OpenAI for structured extraction.
                  </label>
                  <Button
                    disabled={!consent || !text.trim() || busy}
                    aria-label="Organize details"
                    onClick={extract}
                  >
                    {busy ? "Organizing your entry…" : "Organize details"}
                  </Button>
                </details>
                <Button
                  className="primary"
                  aria-label="Continue"
                  disabled={!text.trim()}
                  onClick={reviewManually}
                >
                  Continue <ArrowRight size={15} />
                </Button>
              </>
            ) : (
              <>
                <p className="muted">
                  Every detail needs an exact quote from your entry. Editing
                  your words resets extracted details.
                </p>
                {facts.map((f, i) => (
                  <div className="fact" key={i}>
                    <select
                      aria-label="Detail category"
                      value={f.kind}
                      onChange={(e) =>
                        setFacts(
                          facts.map((x, j) =>
                            j === i
                              ? { ...x, kind: e.target.value as Fact["kind"] }
                              : x,
                          ),
                        )
                      }
                    >
                      {factKinds.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      aria-label="Detail"
                      value={f.value}
                      onChange={(e) =>
                        setFacts(
                          facts.map((x, j) =>
                            j === i ? { ...x, value: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <input
                      aria-label="Exact source quotation"
                      placeholder="Exact quote from your words"
                      value={f.quote}
                      onChange={(e) =>
                        setFacts(
                          facts.map((x, j) =>
                            j === i ? { ...x, quote: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <button
                      aria-label="Remove detail"
                      onClick={() => setFacts(facts.filter((_, j) => j !== i))}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <Button
                  onClick={() =>
                    setFacts([
                      ...facts,
                      { kind: "Pelvic pain", value: "", quote: "" },
                    ])
                  }
                >
                  <Plus size={16} /> Add a detail
                </Button>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={free}
                    onChange={(e) => setFree(e.target.checked)}
                  />{" "}
                  I explicitly reported no symptoms today.
                </label>
                {question && (
                  <div className="followup">
                    <span>ONE OPTIONAL QUESTION</span>
                    <label>
                      {question}
                      <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="A few words, if you’d like…"
                      />
                    </label>
                    <div className="toolbar">
                      <Button
                        onClick={() => {
                          stopCapture();
                          speech.speak(question, true);
                        }}
                      >
                        <Volume2 size={15} /> Read reply aloud
                      </Button>
                      <Button
                        onClick={() =>
                          recording
                            ? recognition.current?.stop()
                            : startMic("answer")
                        }
                      >
                        {recording && voiceTarget === "answer" ? (
                          <Square size={15} />
                        ) : (
                          <Mic size={15} />
                        )}{" "}
                        {recording && voiceTarget === "answer"
                          ? "Stop answer recording"
                          : "Answer by voice"}
                      </Button>
                    </div>
                    <button
                      onClick={() => {
                        stopCapture();
                        speech.stop();
                        setQuestion(null);
                        setAnswer("");
                      }}
                    >
                      Skip
                    </button>
                  </div>
                )}
                <Button className="primary" onClick={save}>
                  <Check size={16} /> Save {answer ? "entry" : "now"}
                </Button>
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
      {settings && (
        <div className="overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
          >
            <button
              className="close"
              aria-label="Close settings"
              onClick={() => {
                speech.stop();
                setSettings(false);
              }}
            >
              <X />
            </button>
            <ShieldCheck />
            <div className="eyebrow">YOUR SPACE</div>
            <h2 id="privacy-title">Settings</h2>
            <section className="settings-section">
              <h3>Your preferences</h3>
              <PersonalPreferences
                value={preferences}
                onSave={updatePreferences}
              />
            </section>
            <details className="settings-section settings-voices">
              <summary>Voice & spoken replies</summary>
              <VoicePicker speech={speech} beforePlay={stopCapture} />
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={speech.enabled}
                  onChange={(e) => speech.setEnabled(e.target.checked)}
                />{" "}
                Read replies aloud with OpenAI
              </label>
              {(speech.speaking || speech.preparing) && (
                <Button onClick={speech.stop}>
                  <VolumeX size={16} />
                  Stop speaking
                </Button>
              )}
              {speech.speechError && (
                <p className="error" role="status">
                  {speech.speechError}
                </p>
              )}
            </details>
            <details className="settings-section">
              <summary>Wearable data</summary>
              <p>
                Explore sleep and activity using a local daily CSV import or
                fictional demo. No device is connected automatically. Imports
                stay in this browser and are not sent to AI.
              </p>
              <Button
                onClick={() => {
                  setSettings(false);
                  setView("Insights");
                }}
              >
                Manage wearable data <ArrowRight size={15} />
              </Button>
            </details>
            <h3 className="settings-subheading">Privacy & your data</h3>
            <p>
              Entries stay in this browser’s IndexedDB. Local browser data is
              not encrypted medical storage. Clearing browser data can erase
              your journal. No accounts, analytics, or raw audio storage.
            </p>
            <p>
              AI extraction requires your explicit consent per session. Only the
              entry text is sent to OpenAI; previous entries are not sent.
              Browser speech recognition may process audio externally. Natural
              spoken replies send reply text to OpenAI after separate consent.
              Spoken replies are opt-in; turn off “Read replies aloud” or use
              “Stop speaking” at any time.
            </p>
            <div className="toolbar">
              <Button
                onClick={() => {
                  const u = URL.createObjectURL(
                    new Blob([JSON.stringify(entries, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = u;
                  a.download = "wholestory-journal.json";
                  a.click();
                  URL.revokeObjectURL(u);
                }}
              >
                Export JSON
              </Button>
              <Button onClick={() => file.current?.click()}>Import JSON</Button>
              <input
                hidden
                ref={file}
                type="file"
                accept="application/json"
                onChange={async (e) => {
                  try {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 10000000) throw Error("File is too large.");
                    await storage.importEntries(JSON.parse(await f.text()));
                    await refresh();
                    setNotice("Journal imported.");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    if (file.current) file.current.value = "";
                  }
                }}
              />
            </div>
            <Button
              className="danger"
              onClick={async () => {
                if (
                  confirm(
                    "Permanently delete all journal entries on this device?",
                  )
                ) {
                  await storage.clearEntries();
                  await clearPreferences();
                  await clearWearables();
                  setPreferences(defaultPreferences);
                  speech.resetPreferences();
                  await refresh();
                  setReviewed(false);
                  setNotice("All local entries deleted.");
                }
              }}
            >
              <Trash2 size={16} /> Delete all local data
            </Button>
            <h3>Clinical context</h3>
            <p>
              Question categories support documentation, not diagnosis or
              treatment advice.
            </p>
            <p>
              <a
                href="https://www.nice.org.uk/guidance/ng73/chapter/recommendations"
                target="_blank"
                rel="noreferrer"
              >
                NICE endometriosis guidance ↗
              </a>
            </p>
            <p>
              <a
                href="https://www.acog.org/clinical/clinical-guidance/clinical-practice-guideline/articles/2026/03/diagnosis-of-endometriosis"
                target="_blank"
                rel="noreferrer"
              >
                ACOG diagnosis guidance ↗
              </a>
            </p>
          </section>
        </div>
      )}
      {!ready && (
        <span className="loading" role="status">
          Opening your journal…
        </span>
      )}
    </div>
  );
  function entryCard(e: Entry) {
    return (
      <article className="entry" key={e.id}>
        <div className="date-badge">
          <strong>{new Date(e.date + "T12:00:00").getDate()}</strong>
          <span>
            {new Date(e.date + "T12:00:00").toLocaleDateString("en", {
              month: "short",
            })}
          </span>
        </div>
        <div className="entry-content">
          <div className="tags">
            {cycleContext(e).day && (
              <span className="cycle-tag">Cycle day {cycleContext(e).day}</span>
            )}
            {e.symptomFree ? (
              <span className="free">Symptom-free · explicitly reported</span>
            ) : (
              [
                ...new Set(
                  e.facts
                    .filter((f) =>
                      categories.includes(
                        f.kind as (typeof categories)[number],
                      ),
                    )
                    .map((f) => f.kind),
                ),
              ].map((k) => <span key={k}>{k}</span>)
            )}
            {e.demo && <small>SYNTHETIC</small>}
          </div>
          <p>{e.text}</p>
          {e.facts.some((f) => f.kind === "Daily-life impact") && (
            <div className="impact">
              Daily-life impact ·{" "}
              {e.facts.find((f) => f.kind === "Daily-life impact")?.value}
            </div>
          )}
          {evidence &&
            e.facts.map((f, i) => (
              <blockquote key={i}>
                {f.kind}: “{f.quote}”
              </blockquote>
            ))}
        </div>
        <button aria-label={`Edit entry ${e.date}`} onClick={() => open(e)}>
          <ArrowUpRight size={19} />
        </button>
        <button
          aria-label={`Delete entry ${e.date}`}
          onClick={async () => {
            if (confirm("Delete this entry?")) {
              await storage.deleteEntry(e.id);
              await refresh();
              setReviewed(false);
            }
          }}
        >
          <Trash2 size={15} />
        </button>
      </article>
    );
  }
}
