"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import type { WearableRecord } from "../lib/wearables";
import { validateWearableRecord } from "../lib/wearables";
import sample from "../data/pmdata-sample.json";
export function WearableConnections({
  onImported,
}: {
  onImported: (record: WearableRecord) => Promise<void>;
}) {
  const [status, setStatus] = useState<{
      configured: boolean;
      connected: boolean;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/wearables/oura/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (active)
          setStatus(
            s &&
              typeof s.configured === "boolean" &&
              typeof s.connected === "boolean"
              ? s
              : null,
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  async function act(action: "sync" | "disconnect") {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(`/api/wearables/oura/${action}`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Connection could not be updated.");
      if (action === "sync") {
        await onImported(validateWearableRecord(data));
        setMessage(
          `Imported ${data.days.length} available daily records from Oura.`,
        );
      } else {
        setStatus((s) => (s ? { ...s, connected: false } : s));
        setMessage(data.message);
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="wearable-import">
      <summary>Connect your Oura account</summary>
      <p>
        Import the last 60 completed calendar dates of sleep and activity.
        elya requests daily-data permission only, not your name or email.
        Your connection uses a separate browser session. Imported measurements stay in this browser and are not sent to AI.
      </p>
      {status?.connected ? (
        <div className="toolbar">
          <Button disabled={busy} onClick={() => act("sync")}>
            {busy ? "Working…" : "Import from Oura"}
          </Button>
          <Button disabled={busy} onClick={() => act("disconnect")}>
            Disconnect Oura
          </Button>
        </div>
      ) : (
        <form method="POST" action="/api/wearables/oura/connect">
          <Button type="submit" disabled={!status?.configured}>
            Continue to Oura
          </Button>
        </form>
      )}
      <p className="muted">
        {status === null
          ? "Connection status is unavailable. You can still use CSV import or the demo."
          : !status.configured
            ? "Oura is not available here. You can import a file or explore a demo."
            : status.connected
              ? "Connected for this short browser session. Import is manual; it replaces your previous wearable import. Reconnect when the session expires."
              : "Oura will ask you to authorize access. You can cancel without sharing data."}
      </p>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
export function PublicWearableSample() {
  return (
    <details className="wearable-import">
      <summary>Explore a public research wearable sample</summary>
      <p>
        <strong>{sample.source}</strong> · {sample.days.length} dates ·{" "}
        {sample.days[0].date} to {sample.days.at(-1)!.date}
      </p>
      <p>{sample.notice}</p>
      <p className="muted">{sample.transformation}</p>
      <div className="wearable-table-wrap">
        <table>
          <caption>
            First 14 dates · original public research dates retained
          </caption>
          <thead>
            <tr>
              <th>Date</th>
              <th>Sleep</th>
              <th>Steps</th>
            </tr>
          </thead>
          <tbody>
            {sample.days.slice(0, 14).map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td>
                <td>
                  {d.sleepHours === null
                    ? "Unknown"
                    : d.sleepHours.toFixed(1) + " h"}
                </td>
                <td>
                  {d.steps === null ? "Unknown" : d.steps.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        {sample.citation} ·{" "}
        <a href={sample.url} target="_blank" rel="noreferrer">
          Original dataset ↗
        </a>{" "}
        ·{" "}
        <a href={sample.licenseUrl} target="_blank" rel="noreferrer">
          {sample.license}
        </a>
        . This public sample is separate from the fictional symptom comparison.
      </p>
    </details>
  );
}
