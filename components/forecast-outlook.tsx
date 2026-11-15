"use client";
import { Activity, Circle, Moon, Waves } from "lucide-react";
import type { symptomRisk } from "../lib/symptom-risk";
import { checkinSymptoms } from "../lib/experience-checkins";
import { Button } from "./ui/button";
export type ForecastResult = ReturnType<typeof symptomRisk>;
const reasons: Record<string,string> = {
  "missing-previous-day-label": "Yesterday’s answer for this symptom is missing. Add a confirmed check-in to give the estimate context.",
  "insufficient-history": "There is not enough confirmed symptom history for an estimate yet.",
  "insufficient-similar-days": "There are not enough comparable answered days for an estimate yet.",
  "cycle-context-unavailable": "Cycle timing is not available.",
  "cycle-regime-unknown": "Cycle timing is not used because the cycle context is unknown.",
  "hormonal-regime-not-modeled": "This version does not model cycle timing with hormonal treatment.",
  "no-confirmed-period-start": "No confirmed period-start date is available.",
  "cycle-length-outside-model-range": "The recorded cycles are outside this experimental model’s range.",
  "insufficient-completed-cycles": "More completed cycles are needed to use calendar context.",
  "cycle-timing-too-uncertain": "Cycle timing varies too much to use calendar context here.",
  "insufficient-cycle-labels": "More confirmed symptom reports are needed alongside cycle dates.",
  "insufficient-matching-cycle-history": "There are not enough comparable cycle days to use calendar context.",
};
export function ForecastOutlook({ result, loading, error, onRetry, onCheckin, onWrite, onRecord }: {
  result: ForecastResult | null; loading: boolean; error: string;
  onRetry: () => void; onCheckin: () => void; onWrite: () => void; onRecord: () => void;
}) {
  const icons = [Activity, Moon, Circle, Waves];
  return <section className="forecast-outlook" aria-labelledby="outlook-heading">
    <div className="page-title"><div className="eyebrow">EXPERIMENTAL SYMPTOM OUTLOOK</div><h1 id="outlook-heading">Tomorrow, a little more context.</h1>
      <p>Estimates of reported symptoms, not their severity or urgency. A lower estimate does not rule out pain.</p>
    </div>
    {loading ? <p role="status">Loading the matching fictional outlook and journal…</p> : error ? <div role="alert"><p>{error}</p><Button onClick={onRetry}>Try again</Button></div> : <>
      <p className="forecast-date">Outlook for {result?.targetDate ?? "tomorrow"}{result ? ` · ${result.timeZone}` : ""}</p>
      <ul className="forecast-list">{checkinSymptoms.map(({key,label},i)=>{
        const s = result?.symptoms.find(s=>s.symptom===key);
        const available = s?.state === "experimental-estimate" && s.probability !== null;
        const state = !available ? "learning" : s.outlook === "higher-estimated-likelihood" ? "elevated" : "usual";
        const Icon = icons[i];
        return <li key={key}><div className="forecast-symptom"><Icon size={22} aria-hidden="true"/><h2>{label}</h2></div>
          <div className={`outlook-state ${state}`}><i aria-hidden="true"/><span className="state-label">{!available ? "Still learning" : state === "elevated" ? "Elevated likelihood" : "Lower estimated likelihood"}</span></div>
          {available ? <><p className="forecast-estimate"><strong>{Math.round(s.probability! * 100)}%</strong><span>Estimate · experimental</span></p><p>Based on confirmed symptom history{s.cycle.probability !== null ? " and reported cycle timing" : ""}.</p></> : <p>{reasons[s?.reason ?? ""] ?? "Add confirmed check-ins to build a symptom history. No estimate is available yet."}</p>}
          {s && <details><summary>What this is based on</summary><p>{s.trainingPairs} usable day pairs; {s.symptomDays} days with this symptom and {s.symptomAbsentDays} with its absence explicitly reported. These counts are not a confidence score.</p>{s.cycle.reason && <p>{reasons[s.cycle.reason] ?? "Calendar context is unavailable for this estimate."}</p>}<p>Clinical accuracy has not been established. Wearable readings are context only and are not used in this estimate.</p></details>}
        </li>;
      })}</ul>
    </>}
    <div className="outlook-actions"><Button className="primary" onClick={onCheckin}>Check in today</Button><button className="back-link" onClick={onWrite}>Write an entry</button><button className="back-link" onClick={onRecord}>Record instead</button></div>
    <p className="muted">Wearable readings are optional context. They do not influence these forecasts, and normal readings do not invalidate pain.</p>
  </section>;
}
