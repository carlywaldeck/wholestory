"use client";
import { useState, useEffect } from "react";
import { useAppNavigation } from "./app-navigation";
import { checkinSymptoms, emptyAnswers, type Answers } from "../lib/experience-checkins";
import { Button } from "./ui/button";
export function QuickCheckin({ date, onSave, onCancel, demo }: {
  date: string; demo: boolean; onSave: (answers: Answers, note: string) => Promise<void>; onCancel: () => void;
}) {
  const [answers, setAnswers] = useState(emptyAnswers);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigation = useAppNavigation();
  useEffect(()=>{
    navigation?.setDirty(!!note.trim() || Object.values(answers).some(v=>v!==null));
    return ()=>navigation?.setDirty(false);
  },[note,answers,navigation?.setDirty]);
  return <section className="quick-checkin" aria-labelledby="checkin-title">
    <div className="section-heading"><h2 id="checkin-title">Check in today</h2><button onClick={onCancel}>Close check-in</button></div>
    {demo && <span className="demo-chip">Fictional demo history</span>}
    <p>{date} · Select what you experienced. Anything unanswered stays unknown.</p>
    <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(""); try { await onSave(answers, note); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }}>
      {checkinSymptoms.map(({key,label}) => <fieldset key={key}>
        <legend>{label}</legend>
        <div className="checkin-options">{[
          { text: "Present", value: true, mark: "●" },
          { text: "None reported", value: false, mark: "◯✓" },
          { text: "Unanswered", value: null, mark: "◌" },
        ].map(({text,value,mark}) => <label key={text} className={answers[key] === value ? "chosen" : ""}>
          <input type="radio" name={key} checked={answers[key] === value} onChange={() => setAnswers(a => ({...a,[key]:value}))} />
          <span aria-hidden="true">{mark}</span>{text}
        </label>)}</div>
      </fieldset>)}
      <label className="checkin-note">Anything else you want remembered? <span>(optional)</span>
        <textarea maxLength={4000} value={note} onChange={e=>setNote(e.target.value)} placeholder="What changed about your day, or what you tried." />
      </label>
      {error && <p role="alert">{error}</p>}
      <Button className="primary" disabled={busy}>{busy ? "Saving…" : "Save check-in"}</Button>
      <p className="muted">{demo ? "This check-in stays in this fictional demo session." : "Saved on this device. Symptom estimates use confirmed check-ins, not assumptions from your writing."}</p>
    </form>
  </section>;
}
