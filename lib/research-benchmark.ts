import snapshot from "../data/pmdata-benchmark-results.json";
/** Recorded research result, not a live-user forecast or a request to an LLM. */
export function benchmarkResponse() {
  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
