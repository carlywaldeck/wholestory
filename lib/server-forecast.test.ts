import { afterEach, expect, it, vi } from "vitest";
import { forecastDemo } from "./forecast-demo";
import { computeForecast, handleForecast } from "./server-forecast";
import { validateEntry, isPresentFact, report, type Fact } from "./model";
const endpoint = "https://wholestory.test/api/forecast";
const request = (
  body: unknown,
  headers: Record<string, string> = {
    Origin: "https://wholestory.test",
    "Content-Type": "application/json",
  },
) =>
  new Request(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
afterEach(() => vi.unstubAllGlobals());
it("provides reproducible fictional forecasts and keeps wearable context out of model claims", async () => {
  vi.stubGlobal("fetch", vi.fn());
  const response = await handleForecast(
    new Request(endpoint + "?persona=maya&targetDate=2026-11-15"),
  );
  const r = await response.json();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(r.demo.disclosure).toContain("Entirely synthetic");
  expect(r.demoInput.days).toHaveLength(168);
  expect(r.demoJournalEntries).toHaveLength(168);
  r.demoJournalEntries.forEach((entry: unknown) => validateEntry(entry));
  const latest = r.demoJournalEntries.at(-1);
  expect(
    latest.facts.some(
      (f: Fact) => f.kind === "Pelvic pain" && isPresentFact(f),
    ),
  ).toBe(r.demoInput.days.at(-1).symptoms.pelvicPain);
  expect(
    report(r.demoJournalEntries).claims.find((c) => c.kind === "Pelvic pain")!
      .days,
  ).toBe(
    r.demoInput.days.filter(
      (d: { symptoms: { pelvicPain: boolean } }) => d.symptoms.pelvicPain,
    ).length,
  );
  expect(r.forecast.kind).toBe("synthetic");
  expect(r.forecast.clinicalValidation).toBe(false);
  expect(r.forecast.wearableContext.usedInForecast).toBe(false);
  expect(r.forecast.symptoms[0].validation.evaluationStatus).toBe("not-run");
  expect(
    r.forecast.symptoms.find(
      (s: { symptom: string }) => s.symptom === "pelvicPain",
    ).cycle.probability,
  ).not.toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});
it("distinguishes cyclical, noncyclical and recently quieter fictional histories", () => {
  const make = (p: "maya" | "alex" | "jules") => {
    const d = forecastDemo(p, "2026-11-15");
    return computeForecast({
      consentToServerProcessing: true,
      input: d.input,
      physiology: d.physiology,
    });
  };
  const maya = make("maya"),
    alex = make("alex"),
    jules = make("jules");
  expect(maya.symptoms[0].probability).toBeGreaterThan(
    jules.symptoms[0].probability!,
  );
  expect(alex.symptoms[0].cycle.reason).toBe("cycle-regime-unknown");
  expect(alex.symptoms[0].probability).not.toBeNull();
  expect(
    maya.symptoms.find((s) => s.symptom === "headache")!.probability,
  ).toBeNull();
});
it("requires same-origin JSON and explicit server-processing consent", async () => {
  const d = forecastDemo("maya", "2026-11-15");
  expect((await handleForecast(request({ input: d.input }))).status).toBe(422);
  expect(
    (
      await handleForecast(
        request(
          { consentToServerProcessing: true, input: d.input },
          {
            Origin: "https://elsewhere.test",
            "Content-Type": "application/json",
          },
        ),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await handleForecast(
        request(
          { consentToServerProcessing: true, input: d.input },
          { "Content-Type": "application/json" },
        ),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await handleForecast(
        request(
          {},
          { Origin: "https://wholestory.test", "Content-Type": "text/plain" },
        ),
      )
    ).status,
  ).toBe(415);
  const result = await handleForecast(
    request({ consentToServerProcessing: true, input: d.input }),
  );
  expect(result.status).toBe(200);
  expect((await result.json()).privacy).toEqual({
    storedByHandler: false,
    sentToExternalAI: false,
  });
});
it("supports the public preview Host when Next uses an internal localhost URL", async () => {
  const d = forecastDemo("maya", "2026-11-15");
  const r = await handleForecast(
    new Request("http://localhost:3101/api/forecast", {
      method: "POST",
      headers: {
        Host: "127.0.0.1:3101",
        Origin: "http://127.0.0.1:3101",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ consentToServerProcessing: true, input: d.input }),
    }),
  );
  expect(r.status).toBe(200);
  const invalid = await handleForecast(
    new Request(endpoint, {
      method: "POST",
      headers: {
        Host: "bad@elsewhere.test",
        Origin: "https://elsewhere.test",
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
  );
  expect(invalid.status).toBe(403);
});
it("rejects mixed-source histories, excessive input and bad demos without echoing health records", async () => {
  const d = forecastDemo("maya", "2026-11-15");
  const mixed = await handleForecast(
    request({
      consentToServerProcessing: true,
      input: { ...d.input, kind: "real" },
      physiology: d.physiology,
    }),
  );
  expect(mixed.status).toBe(422);
  expect(await mixed.text()).not.toContain("nightHeartRateBpm");
  expect(
    (await handleForecast(new Request(endpoint + "?persona=not-a-persona")))
      .status,
  ).toBe(422);
  const large = new Request(endpoint, {
    method: "POST",
    headers: {
      Origin: "https://wholestory.test",
      "Content-Type": "application/json",
    },
    body: "x".repeat(400 * 1024),
  });
  expect((await handleForecast(large)).status).toBe(413);
  expect(
    (await handleForecast(new Request(endpoint, { method: "DELETE" }))).status,
  ).toBe(405);
});
