"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useState } from "react";
import { Entry } from "../lib/model";
import { cycleAnalysis, cycleContext } from "../lib/cycles";
import { DataLegend } from "./brand-states";
export function CycleInsights({
  entries,
  onEvidence,
}: {
  entries: Entry[];
  onEvidence: (ids: string[]) => void;
}) {
  const [mode, setMode] = useState("cycle");
  const c = cycleAnalysis(entries);
  const scored = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: e.date.slice(5),
      pain: cycleContext(e).score,
      id: e.id,
    }));
  const hasScores = scored.some((e) => e.pain !== null);
  return (
    <section className="cycle-card">
      <div className="section-heading">
        <h2>Your cycle context</h2>
        <div className="segmented">
          <button
            className={mode === "cycle" ? "selected" : ""}
            onClick={() => setMode("cycle")}
          >
            By cycle day
          </button>
          <button
            className={mode === "date" ? "selected" : ""}
            onClick={() => setMode("date")}
          >
            By date
          </button>
        </div>
      </div>
      <p className="muted">
        Only explicitly reported cycle dates and scores. Gaps stay unknown; we
        do not assume a 28-day cycle. {c.unknownDays} logged{" "}
        {c.unknownDays === 1 ? "day has" : "days have"} incomplete cycle
        context.
      </p>
      <DataLegend />
      {mode === "cycle" && c.starts.length ? (
        <>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={c.plot}>
              <CartesianGrid stroke="var(--line)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                label={{
                  value: "Reported cycle day",
                  position: "insideBottom",
                  offset: -5,
                  fontSize: 10,
                }}
                height={38}
              />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} width={25} />
              <Tooltip />
              {c.starts.map((start, i) => (
                <Line
                  key={start}
                  name={`Cycle starting ${start}`}
                  type="linear"
                  dataKey={start}
                  stroke="var(--ink)"
                  strokeDasharray={["", "8 4", "3 4", "10 3 2 3"][i % 4]}
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="muted">
            Pain score, 0–10 · highest explicit score per cycle day · up to four
            documented cycles.
          </p>
          <div className="cycle-legend">
            {c.starts.map((start, i) => (
              <span key={start}>
                <i
                  style={{
                    background: "var(--ink)",
                    borderRadius: i % 2 ? "0" : "50%",
                  }}
                />
                {start}
              </span>
            ))}
          </div>
        </>
      ) : mode === "date" && hasScores ? (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={scored}>
              <CartesianGrid stroke="var(--line)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis width={25} domain={[0, 10]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                type="linear"
                dataKey="pain"
                name="Reported pain (0–10)"
                stroke="var(--ink)"
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="muted">
            Only logged dates are shown. Space between points does not represent
            symptom-free days.
          </p>
        </>
      ) : (
        <div className="empty">
          {mode === "cycle"
            ? "Add a reported cycle day and period-start date to compare cycles."
            : "No numeric pain scores reported yet."}
        </div>
      )}
      {c.cycles.map((x) => (
        <button
          className="cycle-summary"
          key={x.start}
          onClick={() => onEvidence(x.ids)}
        >
          Cycle starting {x.start}: pain reported on {x.painDays} of{" "}
          {x.loggedDays} logged days. <span>See entries ↗</span>
        </button>
      ))}
      {c.recurring.slice(0, 3).map((x) => (
        <button
          className="cycle-summary"
          key={x.day}
          onClick={() => onEvidence(x.ids)}
        >
          {x.text} <span>See evidence ↗</span>
        </button>
      ))}
      <p className="muted">
        A small, self-reported sample describes your experience; it cannot show
        what caused it or predict the next cycle.
      </p>
    </section>
  );
}
