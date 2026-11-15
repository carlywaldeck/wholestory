import {handleTts} from "../lib/server-tts";
import { benchmarkResponse } from "../lib/research-benchmark";
import { handleForecast } from "../lib/server-forecast";
import { handleOura, type OuraEnv } from "../lib/server-oura";
import assets from "../work/assets.json";
import { extract } from "../lib/server-extract";
import { generateVoice, voiceStatus } from "../lib/server-voice";
export default {
  async fetch(
    req: Request,
    env: OuraEnv & {
      OPENAI_API_KEY?: string;
      OPENAI_MODEL?: string;
      OPENAI_VOICE_MODEL?: string;
    },
  ) {
    const path = new URL(req.url).pathname;
    if (path === "/api/tts") return handleTts(req,env);
    if (path === "/api/forecast") return handleForecast(req, env);
    if (path === "/api/research/benchmark")
      return req.method === "GET"
        ? benchmarkResponse()
        : new Response("Method not allowed", { status: 405 });
    if (path.startsWith("/api/wearables/oura/")) return handleOura(req, env);
    if (path === "/api/voice") {
      if (req.method === "GET") return voiceStatus(env);
      if (req.method === "POST") return generateVoice(req, env);
      return new Response("Method not allowed", { status: 405 });
    }
    if (path === "/api/extract") {
      if (req.method !== "POST")
        return new Response("Method not allowed", { status: 405 });
      return extract(req, env);
    }
    if (!["GET", "HEAD"].includes(req.method))
      return new Response("Method not allowed", { status: 405 });
    const item = (assets as Record<string, { type: string; body: string }>)[
      path
    ];
    if (!item) return new Response("Not found", { status: 404 });
    const body = Uint8Array.from(atob(item.body), (c) => c.charCodeAt(0));
    return new Response(req.method === "HEAD" ? null : body, {
      headers: {
        "Content-Type": item.type,
        "Cache-Control": path.startsWith("/_next/static/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "same-origin",
        "Permissions-Policy": "camera=(), geolocation=()",
      },
    });
  },
};
