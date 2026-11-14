"use client";
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  FileText,
  Flower2,
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
import { CycleInsights } from "../components/cycle-insights";
import { SafetySection } from "../components/safety-section";
import { safetyBoundary } from "../lib/clinical-context";
import { appointmentQuestions, cycleContext } from "../lib/cycles";
import { useSpokenReplies } from "../hooks/use-spoken-replies";
import { VoicePicker } from "../components/voice-picker";
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
  const [persona, setPersona] = useState<PersonaId>("maya");
  const [customQuestion, setCustomQuestion] = useState("");
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
    if (!editor && !settings) return;
    const previous = document.activeElement as HTMLElement;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeEditor();
        setSettings(false);
      }
      if (e.key === "Tab") {
        const items = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".modal button:not(:disabled),.modal input:not([hidden]),.modal textarea,.modal select,.modal a",
          ),
        );
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
    document.querySelector<HTMLElement>(".modal button")?.focus();
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [editor, settings]);
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
  }, [allEntries]);
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
  function open(e?: Entry) {
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
      open();
      setNotice(
        "Speech recognition is unavailable in this browser. You can type your entry and still enable spoken replies.",
      );
      return;
    }
    open();
    setNotice(
      "Browser speech recognition may send audio to an external service. Use “Start recording” below only if you agree. Choose a voice from the previews to hear spoken replies.",
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
            : "I have captured your words. Choose Extract with AI if you have consented, or Review manually to continue.",
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
      await storage.importEntries(personaEntries(chosen));
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
      await downloadBrief(entries, statement, questions, appendix, BRAND);
    } catch {
      setError("The PDF could not be generated. Please try again.");
    }
  }
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="#" onClick={() => setView("Today")}>
          <Flower2 size={31} />
          {BRAND}
          <span>®</span>
        </a>
        <div className="navlabel">YOUR SPACE</div>
        <nav>
          {[
            ["Today", Flower2],
            ["Your story", BookOpen],
            ["Insights", ChartNoAxesCombined],
            ["Doctor brief", FileText],
          ].map(([label, Icon]) => (
            <button
              className={view === label ? "active" : ""}
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
          <div className="smallflower">✳</div>
          <h3>A little more understood.</h3>
          <p>
            Every entry helps you tell
            <br />
            the whole story.
          </p>
          <button onClick={() => setSettings(true)}>
            <Settings size={17} /> Privacy & settings
          </button>
          <span>
            <ShieldCheck size={14} /> Stored on your device
          </span>
        </div>
      </aside>
      <main>
        <header>
          <span>Your experience matters. All of it.</span>
          {(speech.speaking || speech.preparing) && (
            <button className="stop-reply" onClick={speech.stop}>
              <VolumeX size={14} /> Stop speaking
            </button>
          )}
          <button className="demo-link" onClick={() => tryDemo()}>
            Try demo <ArrowUpRight size={14} />
          </button>
          <button
            className="avatar"
            aria-label="Privacy settings"
            onClick={() => setSettings(true)}
          >
            Y
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
              <div className="eyebrow">A MOMENT FOR YOU</div>
              <h1>How are you feeling today?</h1>
              <p>The little things. The hard things. Start wherever you are.</p>
            </section>
            <section className="capture">
              <div className="capture-flower">✳</div>
              <div className="mic-halo">
                <button
                  className="mic"
                  aria-label="Create a voice entry"
                  onClick={voice}
                >
                  <Mic size={36} strokeWidth={1.5} />
                </button>
              </div>
              <h2>You talk. We talk it through.</h2>
              <p>Tell us about your day. Hear one thoughtful follow-up.</p>
              <button className="type-link" onClick={() => open()}>
                I’d rather type <ArrowRight size={16} />
              </button>
              <div className="capture-note">
                <ShieldCheck size={13} /> Private by default. Always your story.
              </div>
            </section>
            <div className="dashboard-grid">
              <section className="insight-card">
                <div className="section-kicker">
                  <ChartNoAxesCombined size={18} /> A LITTLE PERSPECTIVE
                </div>
                <h2>
                  {data.logged
                    ? "Your everyday life is part of the picture."
                    : "Small moments can reveal a bigger picture."}
                </h2>
                <p>
                  {data.logged
                    ? data.items.find((i) => i.kind === "Daily-life impact")
                        ?.days
                      ? `You mentioned symptoms affecting everyday life on ${data.items.find((i) => i.kind === "Daily-life impact")?.days} logged days. See the moments behind that observation.`
                      : `You’ve captured ${data.logged} ${data.logged === 1 ? "day" : "days"} of your story. Each one adds context to your next conversation.`
                    : "A few entries are all it takes to start noticing what matters to you."}
                </p>
                <button
                  onClick={() => {
                    setView("Insights");
                    setEvidence(null);
                  }}
                >
                  Explore your insights <ArrowUpRight size={16} />
                </button>
                <span className="abstract">✧</span>
              </section>
              <section className="brief-card">
                <div className="section-kicker">
                  <FileText size={18} /> FEEL MORE PREPARED
                </div>
                <h2>
                  Your story, ready <br />
                  for your appointment.
                </h2>
                <p>
                  Bring the details that matter, with the entries behind them.
                </p>
                <button onClick={() => setView("Doctor brief")}>
                  Create a doctor brief <ArrowRight size={16} />
                </button>
              </section>
            </div>
            <section className="recent">
              <div className="section-heading">
                <h2>
                  Recent moments <span>{entries.length}</span>
                </h2>
                <button onClick={() => setView("Your story")}>
                  View your story <ArrowRight size={15} />
                </button>
              </div>
              {!entries.length ? (
                <div className="empty">
                  <BookOpen size={25} />
                  <p>Your story starts with a moment.</p>
                  <span>
                    Add your first entry, or explore a fictional history.
                  </span>
                  <Button onClick={() => tryDemo()}>
                    Try the demo <ArrowUpRight size={15} />
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
              <div className="eyebrow">EVERY MOMENT COUNTS</div>
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
              <div className="eyebrow">CONNECTIONS, WITH CONTEXT</div>
              <h1>A clearer picture.</h1>
              <p>Real counts. Your words. Every observation has a source.</p>
            </section>
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
                  <Bar dataKey="days" fill="#9b87b9" radius={[6, 6, 0, 0]} />
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
              <div className="eyebrow">BRING YOUR WHOLE STORY</div>
              <h1>Your appointment brief.</h1>
              <p>Review your evidence, add your voice, and take it with you.</p>
            </section>
            <section className="report">
              <div className="section-kicker">
                <Flower2 /> {BRAND} / PATIENT-REPORTED SUMMARY
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
              <label>
                Your statement, in your own words
                <textarea
                  maxLength={600}
                  value={statement}
                  onChange={(e) => {
                    setStatement(e.target.value);
                    setReviewed(false);
                  }}
                  placeholder="What would you most like your clinician to understand?"
                />
              </label>
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
                Edit source entries in Your story to correct report claims. Your
                statement is labeled as user authored.
              </p>
            </section>
          </>
        )}
        <SafetySection />
        <footer>
          <span>
            <Flower2 size={16} /> Your story deserves to be heard.
          </span>
          <p>{safetyBoundary}</p>
        </footer>
      </main>
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
            <div className="eyebrow">A MOMENT FOR YOU</div>
            <h2 id="entry-title">
              {review
                ? "Make sure this feels right."
                : "Start wherever you are."}
            </h2>
            <label>
              Entry date
              <input
                type="date"
                max={today()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
            <label>
              Your words
              <textarea
                autoFocus
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
                placeholder="What have you been feeling? How did it affect your day?"
              />
            </label>
            <div className="voice-panel">
              <VoicePicker speech={speech} beforePlay={stopCapture} />
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
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={speech.enabled}
                  onChange={(e) => {
                    stopCapture();
                    speech.setEnabled(e.target.checked);
                  }}
                />{" "}
                Read replies aloud with OpenAI
              </label>
              <p className="muted">
                Recording uses browser speech recognition, which may use an
                external service. Spoken replies are optional. The microphone is
                off while a reply or preview plays; we do not save raw audio.
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
            {!review ? (
              <>
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
                  className="primary"
                  onClick={extract}
                >
                  {busy ? "Carefully reading your entry…" : "Extract with AI"}
                </Button>
                <Button disabled={!text.trim()} onClick={reviewManually}>
                  Review manually <ArrowRight size={15} />
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
              onClick={() => setSettings(false)}
            >
              <X />
            </button>
            <ShieldCheck />
            <h2 id="privacy-title">Your story stays yours.</h2>
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
