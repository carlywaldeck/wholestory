"use client";
import { useState } from "react";
import { Fact } from "../lib/model";
import { Button } from "./ui/button";
type Fields = {
  cycleDay: string;
  cycleStart: string;
  pain: string;
  location: string;
  bleeding: string;
  fatigue: string;
  bowel: string;
  urine: string;
  sex: string;
  gi: string;
  medication: string;
  effect: string;
  impact: string;
};
const empty: Fields = {
  cycleDay: "",
  cycleStart: "",
  pain: "",
  location: "",
  bleeding: "",
  fatigue: "",
  bowel: "",
  urine: "",
  sex: "",
  gi: "",
  medication: "",
  effect: "",
  impact: "",
};
export function StructuredDetails({
  date,
  onAdd,
}: {
  date: string;
  onAdd: (facts: Fact[], text: string) => void;
}) {
  const [v, setV] = useState(empty),
    [error, setError] = useState("");
  const set = (key: keyof Fields, value: string) =>
    setV({ ...v, [key]: value });
  function add() {
    const f: Fact[] = [];
    const fact = (kind: Fact["kind"], value: string, quote: string) => {
      if (value.trim()) f.push({ kind, value: value.trim(), quote });
    };
    if (
      v.cycleDay &&
      (!/^\d+$/.test(v.cycleDay) || +v.cycleDay < 1 || +v.cycleDay > 120)
    ) {
      setError("Cycle day must be a whole number from 1 to 120.");
      return;
    }
    if (v.cycleStart > date) {
      setError("The most recent period start cannot be after the entry date.");
      return;
    }
    if (v.cycleStart && v.cycleDay) {
      const days =
        Math.round((Date.parse(date) - Date.parse(v.cycleStart)) / 86400000) +
        1;
      if (days !== +v.cycleDay) {
        setError(
          "The cycle day and period-start date do not match this entry date. Correct one, or leave it unknown.",
        );
        return;
      }
    }
    for (const key of ["pain", "fatigue"] as const)
      if (v[key] && !/^(10|[0-9])$/.test(v[key])) {
        setError("Scores must be whole numbers from 0 to 10.");
        return;
      }
    fact("Cycle day", v.cycleDay, `I am on cycle day ${v.cycleDay}.`);
    fact(
      "Cycle start",
      v.cycleStart,
      `My most recent period started on ${v.cycleStart}.`,
    );
    if (v.pain) {
      fact("Severity", `${v.pain}/10`, `I rate my pain ${v.pain}/10.`);
      if (+v.pain > 0) fact("Pain", "Reported", `I rate my pain ${v.pain}/10.`);
    }
    fact("Location", v.location, `My pain location is ${v.location}.`);
    fact(
      "Bleeding level",
      v.bleeding,
      `My bleeding level is ${v.bleeding.toLowerCase()}.`,
    );
    if (v.fatigue) {
      fact(
        "Fatigue score",
        `${v.fatigue}/10`,
        `I rate my fatigue ${v.fatigue}/10.`,
      );
      if (+v.fatigue > 0)
        fact("Fatigue", "Reported", `I rate my fatigue ${v.fatigue}/10.`);
    }
    if (v.bowel)
      fact(
        "Pain with bowel movements",
        "Yes",
        "I had pain with bowel movements.",
      );
    if (v.urine)
      fact("Pain with urination", "Yes", "I had pain with urination.");
    if (v.sex) fact("Pain during sex", "Yes", "I had pain during sex.");
    fact(
      "Gastrointestinal symptoms",
      v.gi,
      `My gastrointestinal symptoms were ${v.gi}.`,
    );
    fact("Intervention", v.medication, `I tried ${v.medication}.`);
    fact(
      "Medication effect",
      v.effect,
      `My experience after the intervention: ${v.effect}.`,
    );
    fact("Daily-life impact", v.impact, `My daily-life impact: ${v.impact}.`);
    if (!f.length) {
      setError("Add at least one detail, or keep journaling instead.");
      return;
    }
    setError("");
    onAdd(f, [...new Set(f.map((x) => x.quote))].join("\n"));
    setV(empty);
  }
  return (
    <details className="structured-details">
      <summary>Prefer a form? Add optional cycle & symptom details</summary>
      <p>
        Leave anything you do not know blank. These answers become quoted,
        editable statements in your entry. Day 1 is the first day of your
        period; no cycle length is assumed.
      </p>
      <div className="form-grid">
        <label>
          Cycle day
          <input
            type="number"
            min="1"
            max="120"
            value={v.cycleDay}
            onChange={(e) => set("cycleDay", e.target.value)}
            placeholder="Unknown"
          />
        </label>
        <label>
          Most recent period start
          <input
            type="date"
            max={date}
            value={v.cycleStart}
            onChange={(e) => set("cycleStart", e.target.value)}
          />
        </label>
        <label>
          Pain score (0–10)
          <input
            type="number"
            min="0"
            max="10"
            value={v.pain}
            onChange={(e) => set("pain", e.target.value)}
            placeholder="Not reported"
          />
        </label>
        <label>
          Pain location
          <input
            maxLength={120}
            value={v.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Only where you felt it"
          />
        </label>
        <label>
          Bleeding level
          <select
            value={v.bleeding}
            onChange={(e) => set("bleeding", e.target.value)}
          >
            <option value="">Not reported</option>
            {["None", "Spotting", "Light", "Moderate", "Heavy"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Fatigue score (0–10)
          <input
            type="number"
            min="0"
            max="10"
            value={v.fatigue}
            onChange={(e) => set("fatigue", e.target.value)}
            placeholder="Not reported"
          />
        </label>
      </div>
      <div className="symptom-options">
        {[
          ["bowel", "Pain with bowel movements"],
          ["urine", "Pain with urination"],
          ["sex", "Pain during sex"],
        ].map(([key, label]) => (
          <label key={key} className="checkbox">
            <input
              type="checkbox"
              checked={!!v[key as keyof Fields]}
              onChange={(e) =>
                set(key as keyof Fields, e.target.checked ? "yes" : "")
              }
            />
            {label}
          </label>
        ))}
      </div>
      {[
        ["gi", "Gastrointestinal symptoms"],
        ["medication", "Medication or intervention tried"],
        ["effect", "Did it help? Your experience"],
        ["impact", "Missed work, school, or daily activities"],
      ].map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            maxLength={180}
            value={v[key as keyof Fields]}
            onChange={(e) => set(key as keyof Fields, e.target.value)}
            placeholder="Optional · in your own words"
          />
        </label>
      ))}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Button onClick={add}>Add these details to my entry</Button>
    </details>
  );
}
