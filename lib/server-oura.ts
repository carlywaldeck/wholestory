import { z } from "zod";
import { normalizeOura } from "./wearable-providers/oura";
export type OuraEnv = {
  OURA_CLIENT_ID?: string;
  OURA_CLIENT_SECRET?: string;
  OURA_SESSION_SECRET?: string;
  APP_ORIGIN?: string;
};
const ROOT = "/api/wearables/oura",
  sessionName = "ws_oura_session",
  stateName = "ws_oura_state";
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
const unb64 = (value: string) =>
  Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
function configuration(env: OuraEnv) {
  if (
    !env.OURA_CLIENT_ID ||
    !env.OURA_CLIENT_SECRET ||
    !env.OURA_SESSION_SECRET ||
    env.OURA_SESSION_SECRET.length < 32 ||
    !env.APP_ORIGIN
  )
    return null;
  try {
    const origin = new URL(env.APP_ORIGIN);
    if (
      origin.origin !== env.APP_ORIGIN ||
      !(
        origin.protocol === "https:" ||
        (origin.protocol === "http:" && origin.hostname === "localhost")
      )
    )
      return null;
    return {
      origin: origin.origin,
      redirect: origin.origin + ROOT + "/callback",
      secure: origin.protocol === "https:",
    };
  } catch {
    return null;
  }
}
async function key(env: OuraEnv) {
  return crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(env.OURA_SESSION_SECRET!),
    ),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
async function seal(value: unknown, env: OuraEnv, purpose: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(purpose) },
    await key(env),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return b64(iv) + "." + b64(new Uint8Array(bytes));
}
async function unseal(value: string, env: OuraEnv, purpose: string) {
  try {
    if (value.length > 3800) return null;
    const parts = value.split(".");
    if (parts.length !== 2) return null;
    const bytes = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: unb64(parts[0]),
        additionalData: new TextEncoder().encode(purpose),
      },
      await key(env),
      unb64(parts[1]),
    );
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
function cookie(req: Request, name: string) {
  return (
    (req.headers.get("cookie") || "")
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(name + "="))
      ?.slice(name.length + 1) || ""
  );
}
function setCookie(name: string, value: string, age: number, secure: boolean) {
  return `${name}=${value}; Path=${ROOT}; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? "; Secure" : ""}`;
}
const sessionSchema = z.object({
  accessToken: z.string().min(1).max(2000),
  expiresAt: z.number(),
});
async function session(req: Request, env: OuraEnv) {
  const parsed = sessionSchema.safeParse(
    await unseal(cookie(req, sessionName), env, "session"),
  );
  return parsed.success && parsed.data.expiresAt > Date.now()
    ? parsed.data
    : null;
}
export async function handleOura(
  req: Request,
  env: OuraEnv,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(req.url),
    action = url.pathname.slice(ROOT.length + 1),
    config = configuration(env);
  if (action === "status" && req.method === "GET")
    return json({
      configured: !!config,
      connected: config ? !!(await session(req, env)) : false,
    });
  if (!["connect", "callback", "sync", "disconnect"].includes(action))
    return json({ error: "Not found." }, 404);
  if (!config)
    return json(
      {
        error:
          "Oura is not configured. A developer must set the Oura application credentials, APP_ORIGIN, and session secret.",
      },
      503,
    );
  if (
    action !== "callback" &&
    (req.method !== "POST" || req.headers.get("origin") !== config.origin)
  )
    return json({ error: "Use a same-origin POST request." }, 403);
  if (action === "connect") {
    const state = random(),
      verifier = random(),
      challenge = b64(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(verifier),
          ),
        ),
      );
    const target = new URL("https://cloud.ouraring.com/oauth/authorize");
    target.search = new URLSearchParams({
      response_type: "code",
      client_id: env.OURA_CLIENT_ID!,
      redirect_uri: config.redirect,
      scope: "daily",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString();
    return new Response(null, {
      status: 303,
      headers: {
        Location: target.toString(),
        "Set-Cookie": setCookie(
          stateName,
          await seal(
            { state, verifier, expiresAt: Date.now() + 600000 },
            env,
            "state",
          ),
          600,
          config.secure,
        ),
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  }
  if (action === "callback") {
    if (req.method !== "GET")
      return json({ error: "Method not allowed." }, 405);
    const state = z
      .object({
        state: z.string(),
        verifier: z.string(),
        expiresAt: z.number(),
      })
      .safeParse(await unseal(cookie(req, stateName), env, "state"));
    const headers = new Headers({
      "Set-Cookie": setCookie(stateName, "", 0, config.secure),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    });
    if (
      !state.success ||
      state.data.expiresAt < Date.now() ||
      url.searchParams.get("state") !== state.data.state
    )
      return new Response(
        "Oura sign-in expired or could not be verified. Please start again from WholeStory.",
        { status: 400, headers },
      );
    if (url.searchParams.has("error")) {
      headers.set("Location", config.origin + "/?wearable=cancelled");
      return new Response(null, { status: 303, headers });
    }
    const code = url.searchParams.get("code");
    if (!code || code.length > 2048)
      return new Response("Missing authorization code.", {
        status: 400,
        headers,
      });
    try {
      const response = await fetcher("https://api.ouraring.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "WholeStory/1.0",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: config.redirect,
          client_id: env.OURA_CLIENT_ID!,
          client_secret: env.OURA_CLIENT_SECRET!,
          code_verifier: state.data.verifier,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw Error("token");
      const token = z
        .object({
          access_token: z.string().min(1).max(2000),
          expires_in: z.number().positive(),
          token_type: z.string(),
        })
        .parse(await response.json());
      if (token.token_type.toLowerCase() !== "bearer") throw Error("token");
      // Short session; deliberately do not persist refresh tokens or create background access.
      const age = Math.min(3600, Math.floor(token.expires_in));
      headers.append(
        "Set-Cookie",
        setCookie(
          sessionName,
          await seal(
            {
              accessToken: token.access_token,
              expiresAt: Date.now() + age * 1000,
            },
            env,
            "session",
          ),
          age,
          config.secure,
        ),
      );
      headers.set("Location", config.origin + "/?wearable=oura");
      return new Response(null, { status: 303, headers });
    } catch {
      return new Response(
        "Could not complete Oura sign-in. Please try again.",
        { status: 502, headers },
      );
    }
  }
  const current = await session(req, env);
  if (action === "disconnect")
    return new Response(
      JSON.stringify({
        connected: false,
        message:
          "Local connection removed. To revoke WholeStory’s provider permission, remove it in your Oura account settings.",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": setCookie(sessionName, "", 0, config.secure),
          "Cache-Control": "no-store",
        },
      },
    );
  if (!current)
    return json({ error: "Connect Oura again before importing data." }, 401);
  try {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 59);
    const from = start.toISOString().slice(0, 10),
      to = end.toISOString().slice(0, 10);
    async function collect(kind: "sleep" | "daily_activity") {
      let next: string | null = null;
      const rows: unknown[] = [];
      const seen = new Set<string>();
      for (let page = 0; page < 10; page++) {
        const target = new URL(
          "https://api.ouraring.com/v2/usercollection/" + kind,
        );
        target.search = new URLSearchParams({
          start_date: from,
          end_date: to,
          ...(next ? { next_token: next } : {}),
        }).toString();
        const response = await fetcher(target, {
          headers: {
            Authorization: "Bearer " + current!.accessToken,
            "User-Agent": "WholeStory/1.0",
          },
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok)
          throw Error(
            response.status === 401
              ? "expired"
              : response.status === 429
                ? "rate"
                : "provider",
          );
        const payload = z
          .object({
            data: z.array(z.unknown()).max(1000),
            next_token: z.string().max(8192).nullable().optional(),
          })
          .parse(await response.json());
        rows.push(...payload.data);
        next = payload.next_token || null;
        if (!next) return rows;
        if (seen.has(next)) throw Error("pagination");
        seen.add(next);
      }
      throw Error("pagination");
    }
    const [sleep, activity] = await Promise.all([
      collect("sleep"),
      collect("daily_activity"),
    ]);
    const days = normalizeOura(sleep, activity).filter(
      (d) => d.date >= from && d.date <= to,
    );
    return json({
      source: "Oura · authorized API import",
      days,
      provenance: {
        provider: "oura",
        importedAt: new Date().toISOString(),
        start: from,
        end: to,
        sleepDefinition:
          "Long-sleep episodes summed by local waking date; naps excluded.",
        activityDefinition:
          "Provider daily steps. Missing values are unknown, not zero.",
        note: "Recent records may arrive late. WholeStory does not assess device accuracy.",
      },
    });
  } catch (err) {
    const code = (err as Error).message;
    return json(
      {
        error:
          code === "expired"
            ? "Oura authorization expired. Reconnect and try again."
            : code === "rate"
              ? "Oura rate limit reached. Please try again later."
              : "Oura data could not be imported completely. Your existing local records are unchanged.",
      },
      code === "expired" ? 401 : 502,
    );
  }
}
