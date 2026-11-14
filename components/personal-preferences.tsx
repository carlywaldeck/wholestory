"use client";
import { useEffect, useState } from "react";
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
  useEffect(() => setDraft(value), [value]);
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
