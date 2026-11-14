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
  isPresentFact,
} from "../lib/model";
import * as storage from "../lib/storage";
import type { ForecastPersona as PersonaId } from "../lib/forecast-demo";
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
import { JourneyProgress } from "../components/journey-progress";
import { HeroBackground } from "../components/hero-background";
import { DataLegend, SymptomOutlook } from "../components/brand-states";
import { ForecastOutlook, type ForecastResult } from "../components/forecast-outlook";
import { QuickCheckin } from "../components/quick-checkin";
import { Wordmark } from "../components/wordmark";
import { symptomRisk, type RiskInput } from "../lib/symptom-risk";
import { shiftDate } from "../lib/forecast-time";
import { checkinRecord, checkinSymptoms, loadConfirmedDays, saveConfirmedDay, forgetConfirmedDay, clearConfirmedDays, type Answers } from "../lib/experience-checkins";
import {
  defaultPreferences,
  loadPreferences,
  savePreferences,
  clearPreferences,
  type Preferences,
} from "../lib/preferences";
const BRAND = "elya";
const forecastPeople = [{id:"maya",name:"Maya"},{id:"alex",name:"Alex"},{id:"jules",name:"Jules"}] as const;
type ForecastDemo = {
  demo: { persona: PersonaId; label: string; disclosure: string };
  forecast: ForecastResult;
  demoInput: RiskInput;
  demoPhysiology: { date: string; sleepHours: number | null; steps: number | null }[];
  demoJournalEntries: Entry[];
};
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
          setShowWelcome(false);
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
  const [forecastDemo, setForecastDemo] = useState<ForecastDemo | null>(null);
  const [personalForecast, setPersonalForecast] = useState<ForecastResult | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [checkin, setCheckin] = useState(false);
  const [checkinVersion, setCheckinVersion] = useState(0);
  const [journalLimit, setJournalLimit] = useState(14);
  const forecastRequest = useRef(0);
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
    [calendar, setCalendar] = useState(false),
    [openingMenu, setOpeningMenu] = useState(false);
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
    if (demoMode) return;
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setPersonalForecast(symptomRisk({ kind: "real", targetDate: shiftDate(today(), 1), asOf: new Date().toISOString(), timeZone, days: loadConfirmedDays() }, { evaluate: false }));
      setForecastError("");
    } catch {
      setForecastError("Your saved check-ins could not be read. Your journal is still available.");
    }
  }, [demoMode, checkinVersion]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);
  useEffect(() => {
    if (evidence)
      document
        .getElementById("supporting-entries")
        ?.scrollIntoView({ block: "start" });
  }, [evidence, view]);
  const entries = demoMode ? (forecastDemo?.demoJournalEntries ?? []).slice().sort((a,b)=>b.date.localeCompare(a.date)) : allEntries.filter(e=>!e.demo);
  const demo = demoMode;
  const data = insights(entries);
  const brief = report(entries);
  const symptomClaims = brief.claims.filter((claim) =>
    categories.includes(claim.kind as (typeof categories)[number]),
  );
  const impactClaims = brief.claims.filter((claim) => claim.kind === "Daily-life impact");
  const treatmentEntries = entries.filter((e) => e.facts.some((f) =>
    ["Intervention", "Medication effect", "What helped"].includes(f.kind),
  )).slice(0, 4);
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
      const updatedEntry = validateEntry({
          id: id || crypto.randomUUID(),
          date,
          text: combined,
          facts,
          symptomFree: free,
          demo,
          ...(demo ? { persona } : {}),
        });
      const sourceDate = entries.find(e=>e.id===id)?.date;
      if (demo) {
        setForecastDemo(current => {
          if (!current) return current;
          const input = {...current.demoInput, days: current.demoInput.days.filter(d=>d.date!==updatedEntry.date && d.date!==sourceDate)};
          return { ...current, demoInput: input, forecast: symptomRisk(input,{evaluate:false}), demoJournalEntries: [updatedEntry, ...current.demoJournalEntries.filter(e=>e.id!==updatedEntry.id)] };
        });
      } else {
        await storage.putEntry(updatedEntry);
        if(id.startsWith("checkin-personal-")) { forgetConfirmedDay(sourceDate ?? date); setCheckinVersion(n=>n+1); }
      }
      setEditor(false);
      await refresh();
      setView("Your story");
      setNotice(demo ? "Your fictional entry is saved for this demo session." : "Your entry is saved on this device.");
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
    const request = ++forecastRequest.current;
    setForecastLoading(true);
    setForecastError("");
    setCheckin(false);
    setView("Outlook");
    try {
      const response = await fetch(`/api/forecast?persona=${chosen}&targetDate=${shiftDate(today(), 1)}`);
      if (!response.ok) throw Error("The fictional outlook could not be loaded. Please try again.");
      const payload = await response.json() as ForecastDemo;
      if (payload.demo?.persona !== chosen || !payload.forecast?.symptoms || !Array.isArray(payload.demoJournalEntries)) throw Error("The demo response was incomplete. Please try again.");
      const matched = payload.demoJournalEntries.map(validateEntry);
      if (matched.some(e=>!e.demo || e.persona!==chosen || !e.id.startsWith("forecast-demo-"))) throw Error("The demo history did not match the selected person.");
      if (request !== forecastRequest.current) return;
      setForecastDemo({ ...payload, demoJournalEntries: matched });
      setPersona(chosen);
      setJournalLimit(14);
      setDemoMode(true);
      setQuestions([]); setStatement(""); setEvidence(null); setSelected(""); setReviewed(false); setWearableNote("");
      setNotice(
        "Matching fictional outlook, journal and appointment history loaded. Personal records stay separate.",
      );
    } catch (e) {
      if (request === forecastRequest.current) setForecastError((e as Error).message);
    } finally {
      if (request === forecastRequest.current) setForecastLoading(false);
    }
  }
  async function saveCheckin(answers: Answers, note: string) {
    const { day, entry } = checkinRecord(today(), answers, note, demo ? persona : undefined);
    if (demo && forecastDemo) {
      const input: RiskInput = { ...forecastDemo.demoInput, asOf: new Date().toISOString(), days: [...forecastDemo.demoInput.days.filter(d=>d.date!==day.date),day] };
      const result = symptomRisk(input, {evaluate:false});
      setForecastDemo({ ...forecastDemo, demoInput: input, forecast: result, demoJournalEntries: [entry,...forecastDemo.demoJournalEntries.filter(e=>e.date!==entry.date)] });
    } else {
      await storage.putEntry(entry);
      saveConfirmedDay(day);
      await refresh();
      setCheckinVersion(n=>n+1);
    }
    setCheckin(false); setReviewed(false); setView("Your story");
    setNotice(demo ? "Fictional check-in saved. Review it in your journal." : "Check-in saved on this device. Review it in your journal.");
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
  const openingMode = view === "Today";
  return (
    <div className={`shell${openingMode ? " opening-mode" : ""}`}>
      <aside>
        <a className="brand" href="#" onClick={() => setView("Today")}>
          <Wordmark />
        </a>
        <div className="navlabel">YOUR JOURNAL</div>
        <nav>
          {[
            ["Outlook", CalendarDays],
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
              <span>{label === "Your story" ? "Journal" : String(label)}</span>
              {view === label && <span className="dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="sidebar-note">
            Your entries stay on this device.
            <br />Review them when you need them.
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
            <span>/</span> {view === "Your story" ? "Journal" : view}
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
            <span className="demo-chip">Fictional demo history</span>{" "}
            <span>Fictional entries for exploring elya.</span>
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
              {forecastPeople.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={async () => {
                forecastRequest.current++;
                setForecastLoading(false); setForecastError(""); setForecastDemo(null); setCheckin(false);
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
        {demo && forecastDemo && <p className="demo-disclosure">{forecastDemo.demo.label} · {forecastDemo.demo.disclosure}</p>}
        {checkin && <QuickCheckin date={today()} demo={demo} onCancel={()=>setCheckin(false)} onSave={saveCheckin} />}
        {view === "Outlook" ? (
          <>
          {!demo && <div className="persona-chooser"><label htmlFor="forecast-persona">Explore a fictional outlook</label>
            <select id="forecast-persona" value={demo ? persona : ""} disabled={forecastLoading} onChange={e=>{if(e.target.value)void tryDemo(e.target.value as PersonaId);}}>
              <option value="" disabled>Choose a fictional person</option><option value="maya">Maya · Cyclical symptoms</option><option value="alex">Alex · Symptoms beyond period days</option><option value="jules">Jules · Fewer recent symptoms</option>
            </select>
            <p>No wearable or API account needed. Personal records stay separate.</p>
          </div>}
          <ForecastOutlook result={demo ? forecastDemo?.forecast ?? null : personalForecast} loading={forecastLoading} error={forecastError}
            onRetry={()=>demo ? void tryDemo() : setCheckinVersion(n=>n+1)}
            onCheckin={()=>{setCheckin(true); window.scrollTo(0,0);}} onWrite={()=>open()} onRecord={()=>voice()} />
          </>
        ) : view === "Today" ? (
          <>
            {openingMode ? (
              <section className="opening-screen" aria-label="Start your story">
                <HeroBackground />
                <div className="opening-copy">
                  <h1>Your life with endometriosis deserves to be understood.</h1>
                  <p>Bring Oura data and your symptom notes together to prepare for care.</p>
                </div>
                <button
                  className="opening-menu-trigger"
                  aria-expanded={openingMenu}
                  aria-controls="opening-menu"
                  onClick={() => setOpeningMenu((open) => !open)}
                >
                  Menu
                </button>
                {openingMenu && (
                  <div className="opening-menu" id="opening-menu">
                    <button onClick={() => { setOpeningMenu(false); setView("Outlook"); }}>
                      Outlook
                    </button>
                    <button onClick={() => { setOpeningMenu(false); setView("Your story"); }}>
                      Your story
                    </button>
                    <button onClick={() => { setOpeningMenu(false); setView("Appointment brief"); }}>
                      Appointment brief
                    </button>
                    <button onClick={() => { setOpeningMenu(false); setSettings(true); }}>
                      Privacy & settings
                    </button>
                    <button onClick={() => { setOpeningMenu(false); void tryDemo(); }}>
                      Try demo
                    </button>
                  </div>
                )}
                <button
                  className="opening-start"
                  aria-label="Write an entry"
                  onClick={() => open()}
                >
                  <span>Start your story</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <button className="visually-hidden" onClick={() => voice()}>
                  Record instead
                </button>
              </section>
            ) : (
              <>
                <section className="intro">
                  <HeroBackground />
                  <div className="eyebrow">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <h1>How are you feeling today?</h1>
                  <p>
                    Write or record what happened and how it affected your day.
                  </p>
                </section>
                <SymptomOutlook />
                <JourneyProgress
                  current="capture"
                  hasEntries={entries.length > 0}
                  onNavigate={(step) => {
                    if (step === "capture") open();
                    if (step === "review") setView("Your story");
                    if (step === "prepare") setView("Appointment brief");
                  }}
                />
                <section className="capture">
              <div className="capture-copy">
                <span className="section-kicker">NEW ENTRY</span>
                <h2>Add an entry.</h2>
                <p>
                  Write an entry or record a transcript. Review it before saving.
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
              </>
            )}
            {entries.length > 0 && (
              <section className="next-step">
                <div>
                  <span className="section-kicker">APPOINTMENT PREPARATION</span>
                  <h2>Prepare an appointment brief.</h2>
                  <p>
                    Review your entries, choose what to include, and export a
                    source-linked PDF.
                  </p>
                </div>
                <Button onClick={() => setView("Appointment brief")}>
                  Prepare your brief <ArrowRight size={16} />
                </Button>
              </section>
            )}
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
                  <p>No entries yet.</p>
                  <span>
                    Add an entry to start your journal.
                  </span>
                  <Button onClick={() => tryDemo()}>
                    Try a fictional journal <ArrowRight size={15} />
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
              <h1>Journal</h1>
              <p>Edit entries and review the details you want to bring to care.</p>
            </section>
            <JourneyProgress
              current="review"
              hasEntries={entries.length > 0}
              onNavigate={(step) => {
                if (step === "capture") open();
                if (step === "prepare") setView("Appointment brief");
              }}
            />
            <div className="toolbar">
              <Button className="primary" onClick={()=>setCheckin(true)}>Check in today</Button>
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
              <Button onClick={() => open()}>
                <Plus size={17} /> Add entry
              </Button>
            </div>
            {calendar && (
              <section className="calendar">
                <p>
                  Last 30 days · Only your explicit reports are observations.
                </p>
                <DataLegend />
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
                        className={es.length ? (es.every((e) => e.symptomFree) ? "none-reported" : "logged") : "unknown-day"}
                        aria-label={`${day}: ${es.length ? (es.every((e) => e.symptomFree) ? "None reported" : "Observation") : "Unknown"}`}
                        onClick={() => setSelected(selected === day ? "" : day)}
                      >
                        {d.getDate()}
                        <span>
                          {es.length
                            ? es.every((e) => e.symptomFree)
                              ? "◯✓"
                              : "●"
                            : "Unknown"}
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
            <DataLegend />
            {visible.slice(0,journalLimit).map((e) => entryCard(e))}
            {visible.length > journalLimit && <Button onClick={()=>setJournalLimit(n=>n+14)}>Show more entries ({visible.length-journalLimit} remaining)</Button>}
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
              <h1>Sleep and movement</h1>
              <p>
                Compare imported daily measurements with logged daily-life impact.
              </p>
            </section>
            {demo && forecastDemo ? <section className="wearable-explorer"><h2>Fictional wearable context</h2>
              <span className="demo-chip">Fictional demo history</span>
              <p>These readings come from the same fictional history as the outlook. They are not used in symptom forecasts.</p>
              <details><summary>See matching context</summary><table><thead><tr><th>Date</th><th>Sleep hours</th><th>Steps</th></tr></thead><tbody>{forecastDemo.demoPhysiology.slice(-7).map(d=><tr key={d.date}><td>{d.date}</td><td>{d.sleepHours ?? "Unknown"}</td><td>{d.steps ?? "Unknown"}</td></tr>)}</tbody></table></details>
            </section> : <WearableExplorer
              entries={entries}
              demo={demo}
              onDemo={() => tryDemo()}
              onEvidence={setEvidence}
              onInclude={(text) => {
                setWearableNote(text);
                setReviewed(false);
                if (text) setView("Appointment brief");
              }}
            />}
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
                      tick={{ fontSize: "var(--type-label)" }}
                      width={135}
                    />
                    <Tooltip />
                    <Bar dataKey="days" fill="var(--ink)" radius={[6, 6, 0, 0]} />
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
              <h1>Appointment brief</h1>
              <p>Review your symptoms, daily-life impact, and questions before you export.</p>
            </section>
            <JourneyProgress
              current="prepare"
              hasEntries={entries.length > 0}
              onNavigate={(step) => {
                if (step === "capture") open();
                if (step === "review") setView("Your story");
              }}
            />
            {!entries.length ? (
              <section className="brief-empty">
                <span className="section-kicker">
                  START WITH YOUR EXPERIENCE
                </span>
                <h2>Add an entry to build your brief.</h2>
                <p>
                  Your brief will include reported symptoms, daily-life impact,
                  what you tried, and questions for your clinician.
                </p>
                <Button className="primary" onClick={() => open()}>
                  Write your first entry <ArrowRight size={16} />
                </Button>
                <button className="back-link" onClick={() => tryDemo()}>
                  Try a fictional example
                </button>
              </section>
            ) : (
              <section className="report">
                <div className="section-kicker">
                  <BookOpen /> <Wordmark size="sm" /> / PATIENT-REPORTED SUMMARY
                </div>
                {demo && <b className="demo-chip">Fictional demo history</b>}
                <DataLegend />
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
                <div className="brief-section">
                  <h3>Reported symptoms</h3>
                  {symptomClaims.map((c) => (
                    <p key={c.kind}>
                      <button className="claim" onClick={() => { setEvidence(c.ids); setView("Insights"); }}>
                        {c.text} <ArrowUpRight size={13} />
                      </button>
                    </p>
                  ))}
                  {!symptomClaims.length && <p>No structured symptoms reported yet.</p>}
                </div>
                <div className="brief-section">
                  <h3>Impact on daily life</h3>
                  {impactClaims.map((c) => (
                    <p key={c.kind}>
                      <button className="claim" onClick={() => { setEvidence(c.ids); setView("Insights"); }}>
                        {c.text} <ArrowUpRight size={13} />
                      </button>
                    </p>
                  ))}
                  {!impactClaims.length && <p className="muted">No daily-life impact has been structured yet. You can add it by editing a source entry.</p>}
                </div>
                <div className="brief-section">
                  <h3>What I tried and what I noticed</h3>
                  {treatmentEntries.length ? treatmentEntries.map((e) => (
                    <p key={e.id}>
                      <button className="claim" onClick={() => { setEvidence([e.id]); setView("Insights"); }}>
                        {e.date}: {e.facts.filter((f) => ["Intervention", "Medication effect", "What helped"].includes(f.kind)).map((f) => `“${f.quote}”`).join(" ")} <ArrowUpRight size={13} />
                      </button>
                    </p>
                  )) : <p className="muted">Nothing has been added here yet. Your original notes remain available in Your story.</p>}
                </div>
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
                <div className="review-check">
                  <strong>One last check before you share</strong>
                  <span>Open any linked source entry to correct it. The PDF keeps your wording and source references.</span>
                </div>
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
            <Wordmark size="sm" />{" "}
            <span>Private journal. Saved on this device.</span>
          </span>
          <p>{safetyBoundary}</p>
          <p>Experimental symptom-risk estimates. Not a diagnostic tool or a replacement for medical care.</p>
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
              <Wordmark size="lg" />
            </div>
            <div className="eyebrow">SET UP YOUR JOURNAL</div>
            <h2 id="welcome-title">Set up elya.</h2>
            <p>
              Choose a name and a default way to add entries. You can change
              these later in Settings. Your journal stays in this browser.
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
            {id.startsWith("checkin-") || id.startsWith("forecast-demo-") ? <p className="muted">Editing this entry removes that day’s old forecast answers. Confirm them again with a check-in; writing alone does not update symptom labels.</p> : null}
            {demo && <span className="demo-chip">Fictional demo history</span>}
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
            <Button onClick={()=>{setSettings(false);setView("Today");}}>View the fabric welcome screen</Button>
            {demo && <span className="demo-chip">Fictional demo history</span>}
            <p className="brand-boundary">Experimental symptom-risk estimates. Not a diagnostic tool or a replacement for medical care.</p>
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
                  a.download = "elya-journal.json";
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
                  clearConfirmedDays(); setCheckinVersion(n=>n+1);
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
      {!ready && editor && (
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
              <span className="free"><span aria-hidden="true">◯✓ </span>None reported · explicitly confirmed</span>
            ) : (
              [
                ...new Set(
                  e.facts
                    .filter((f) => isPresentFact(f) &&
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
          <div className="journal-symptoms">{checkinSymptoms.map(s=>{
            const fact=e.facts.find(f=>f.kind===s.kind);
            const state=!fact?"Unknown":isPresentFact(fact)?"Present":"None reported";
            return <span key={s.key} className={!fact?"unknown-label":""}><b>{s.label}:</b> {state}</span>;
          })}</div>
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
              if (demo) setForecastDemo(current=>{
                if(!current)return current;
                const input={...current.demoInput,days:current.demoInput.days.filter(d=>d.date!==e.date)};
                return {...current,demoInput:input,forecast:symptomRisk(input,{evaluate:false}),demoJournalEntries:current.demoJournalEntries.filter(row=>row.id!==e.id)};
              });
              else { await storage.deleteEntry(e.id); if(e.id.startsWith("checkin-personal-")) {forgetConfirmedDay(e.date);setCheckinVersion(n=>n+1);} await refresh(); }
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
