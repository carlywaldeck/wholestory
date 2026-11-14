import { z } from "zod";
import { forecastDemo, forecastPersonas } from "./forecast-demo";
import { forecastDemoJournal } from "./forecast-demo-journal";
import { physiologyContext, physiologyDaySchema } from "./forecast-physiology";
import { localDate, shiftDate } from "./forecast-time";
import { riskInputSchema, riskSymptoms, symptomRisk } from "./symptom-risk";

const MAX_BYTES = 384 * 1024;
const requestSchema = z
  .object({
    consentToServerProcessing: z.literal(true),
    input: riskInputSchema.refine(
      (v) => v.days.length <= 365,
      "Server requests support up to 365 days.",
    ),
    physiology: z.array(physiologyDaySchema).max(365).default([]),
  })
  .strict();
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
class PayloadTooLarge extends Error {}
async function readJSON(req: Request) {
  if (Number(req.headers.get("content-length")) > MAX_BYTES)
    throw new PayloadTooLarge();
  const reader = req.body?.getReader();
  if (!reader) throw Error("No body");
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new PayloadTooLarge();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
export function computeForecast(raw: unknown) {
  const data = requestSchema.parse(raw);
  // Validate all sources before running the model, so a source conflict fails closed.
  const wearableContext = physiologyContext(
    data.physiology,
    data.input.targetDate,
    data.input.asOf,
    data.input.timeZone,
    data.input.kind,
  );
  return {
    schemaVersion: "1.0",
    // Keep expensive retrospective replay out of every live forecast request.
    // Developers can evaluate locally via symptomRisk(input) or the offline tools.
    ...symptomRisk(data.input, { evaluate: false }),
    wearableContext,
    privacy: { storedByHandler: false, sentToExternalAI: false },
    primarySymptoms: ["pelvicPain", "fatigue", "bloating", "bowelSymptoms"],
  };
}
/** Ephemeral optional server compute. The same model can run locally for real records.
 * This handler writes no records, logs no payloads, and makes no external requests.
 */
export async function handleForecast(
  req: Request,
  env: { APP_ORIGIN?: string } = {},
  now = new Date(),
) {
  const url = new URL(req.url);
  if (req.method === "GET") {
    if (!url.searchParams.has("persona"))
      return json({
        schemaVersion: "1.0",
        modelVersion: "0.2.0",
        status: "experimental",
        clinicalValidation: false,
        symptoms: riskSymptoms,
        personas: forecastPersonas,
        demo: "GET /api/forecast?persona=maya&targetDate=YYYY-MM-DD",
        compute:
          "POST /api/forecast with explicit server-processing consent; local compute is also available.",
      });
    try {
      const persona = z
        .enum(forecastPersonas)
        .parse(url.searchParams.get("persona"));
      const target = z.iso
        .date()
        .parse(
          url.searchParams.get("targetDate") ??
            shiftDate(localDate(now.toISOString(), "UTC"), 1),
        );
      const demo = forecastDemo(persona, target);
      return json({
        demo: {
          persona: demo.persona,
          label: demo.label,
          disclosure: demo.disclosure,
        },
        forecast: computeForecast({
          consentToServerProcessing: true,
          input: demo.input,
          physiology: demo.physiology,
        }),
        demoInput: demo.input,
        demoPhysiology: demo.physiology,
        demoJournalEntries: forecastDemoJournal(demo),
      });
    } catch {
      return json(
        {
          error: "Choose a supported fictional persona and a valid targetDate.",
        },
        422,
      );
    }
  }
  if (req.method !== "POST")
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, POST", "Cache-Control": "no-store" },
    });
  const origin = env.APP_ORIGIN ?? url.origin;
  if (req.headers.get("origin") !== origin)
    return json({ error: "Same-origin requests are required." }, 403);
  if (!/^application\/json(?:;|$)/i.test(req.headers.get("content-type") ?? ""))
    return json({ error: "Use application/json." }, 415);
  try {
    return json(computeForecast(await readJSON(req)));
  } catch (error) {
    return error instanceof PayloadTooLarge
      ? json({ error: "Request exceeds the size limit." }, 413)
      : json(
          {
            error:
              "Forecast input could not be validated. Confirm dates, explicit boolean/null symptom labels, source types, time zone, history limits and server-processing consent.",
          },
          422,
        );
  }
}
