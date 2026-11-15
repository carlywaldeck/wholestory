"use client";
import { useEffect, useRef, useState } from "react";
import { PenLine, Mic, ArrowRight, Check } from "lucide-react";
import { Preferences, defaultPreferences } from "../lib/preferences";
import { Button } from "./ui/button";
export function PersonalPreferences({
  value,
  onSave,
  onboarding = false,
}: {
  value: Preferences;
  onSave: (value: Preferences) => Promise<void>;
  onboarding?: boolean;
}) {
  const [draft, setDraft] = useState(value),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const queued=useRef(Promise.resolve());const pending=useRef(0);
  useEffect(() => {if(!pending.current)setDraft(value);}, [value]);
  useEffect(()=>{if(!onboarding){try{const saved=localStorage.getItem("elya.journalMode");if(saved)setDraft(v=>({...v,inputMode:saved==="speak"?"voice":"write"}));}catch{}}},[]);
  function autosave(next:Preferences){setDraft(next);setSaved(false);setError("");setBusy(true);pending.current++;queued.current=queued.current.catch(()=>{}).then(async()=>{try{await onSave({...next,name:next.name.trim(),setupComplete:true});setError("");}catch{setError("Your preferences could not be saved. Change the field to try again.");}finally{pending.current--;if(!pending.current){setBusy(false);setSaved(true);}}});}

  async function save(next = draft) {
    setBusy(true);
    setError("");
    try {
      await onSave({ ...next, name: next.name.trim(), setupComplete: true });
      setSaved(true);
    } catch {
      setError("Your preferences could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if(!onboarding)return <div className="personal-preferences"><label>What should we call you? <span className="optional">Optional</span><input autoComplete="given-name" maxLength={60} value={draft.name} placeholder="Your first name" onChange={e=>autosave({...draft,name:e.target.value})}/></label><fieldset><legend>How would you like to journal?</legend><div className="settings-input-choice">{([['write','Write'],['voice','Talk']] as const).map(([mode,label])=><label key={mode}><input type="radio" name="settings-input" checked={draft.inputMode===mode} onChange={()=>autosave({...draft,inputMode:mode})}/>{label}</label>)}</div></fieldset><p role="status">{error|| (busy?"Saving…":saved?"Saved automatically.":"Changes save automatically on this device.")}</p></div>;
  return (
    <div className="personal-preferences">
      <label>
        What should we call you? <span className="optional">Optional</span>
        <input
          autoComplete="given-name"
          maxLength={60}
          value={draft.name}
          onChange={(e) => {
            setSaved(false);
            setDraft({ ...draft, name: e.target.value });
          }}
          placeholder="Your first name"
        />
      </label>
      <fieldset>
        <legend>How would you like to start an entry?</legend>
        <div className="preference-options">
          {(
            [
              {
                mode: "write",
                title: "Write it down",
                text: "Type an entry and review it before saving.",
                icon: PenLine,
              },
              {
                mode: "voice",
                title: "Talk it through",
                text: "Record, then check the transcript.",
                icon: Mic,
              },
            ] as const
          ).map(({ mode, title, text, icon: Icon }) => (
            <label
              className={
                draft.inputMode === mode
                  ? "preference-option selected"
                  : "preference-option"
              }
              key={mode}
            >
              <input
                type="radio"
                name={onboarding ? "welcome-input" : "settings-input"}
                value={mode}
                checked={draft.inputMode === mode}
                onChange={() => {
                  setSaved(false);
                  setDraft({ ...draft, inputMode: mode });
                }}
              />
              <Icon size={21} />
              <strong>{title}</strong>
              <span>{text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="muted">
        You can use either option at any time. Voice selection and spoken
        replies live in Settings; nothing plays automatically.
      </p>
      <div className="preferences-actions">
        <Button className="primary" disabled={busy} onClick={() => save()}>
          {onboarding ? "Make yourself at home" : "Save preferences"}
          {onboarding ? <ArrowRight size={16} /> : <Check size={16} />}
        </Button>
        {onboarding && (
          <button onClick={() => save(defaultPreferences)} disabled={busy}>
            Set up later
          </button>
        )}
        {saved && !onboarding && <span role="status">Preferences saved.</span>}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
