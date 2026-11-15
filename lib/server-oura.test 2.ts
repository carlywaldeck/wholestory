import { it, expect, vi } from "vitest";
import { handleOura, OuraEnv } from "./server-oura";
const env: OuraEnv = {
  APP_ORIGIN: "https://example.test",
  OURA_CLIENT_ID: "test-client",
  OURA_CLIENT_SECRET: "test-secret",
  OURA_SESSION_SECRET: "test-only-secret-with-at-least-32-random-characters",
};
const base = env.APP_ORIGIN + "/api/wearables/oura/";
const request = (action: string, options: RequestInit = {}) =>
  new Request(base + action, options);
const post = (action: string, cookie = "", origin = env.APP_ORIGIN!) =>
  request(action, { method: "POST", headers: { origin, cookie } });
async function begin() {
  const r = await handleOura(post("connect"), env);
  const url = new URL(r.headers.get("Location")!);
  return { r, url, cookie: r.headers.getSetCookie()[0].split(";")[0] };
}
it("does not claim a connection before configuration and rejects cross-origin writes", async () => {
  expect(await (await handleOura(request("status"), {})).json()).toEqual({
    configured: false,
    connected: false,
  });
  expect(
    (await handleOura(post("connect", "", "https://evil.test"), env)).status,
  ).toBe(403);
  expect((await handleOura(request("sync"), env)).status).toBe(403);
});
it("uses PKCE, minimal scope and expiring HttpOnly secure state; rejects forged callbacks", async () => {
  const { r, url, cookie } = await begin();
  expect(url.searchParams.get("scope")).toBe("daily");
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(r.headers.getSetCookie()[0]).toContain("HttpOnly; SameSite=Lax");
  expect(r.headers.getSetCookie()[0]).toContain("Secure");
  const f = vi.fn();
  const bad = await handleOura(
    request("callback?state=forged&code=anything", { headers: { cookie } }),
    env,
    f as typeof fetch,
  );
  expect(bad.status).toBe(400);
  expect(f).not.toHaveBeenCalled();
});
it("keeps access tokens encrypted and imports paginated data without exposing tokens", async () => {
  const { url, cookie } = await begin();
  const exchange = vi.fn(async () =>
    Response.json({
      access_token: "private-test-token",
      expires_in: 3600,
      token_type: "bearer",
      refresh_token: "do-not-store",
    }),
  );
  const callback = await handleOura(
    request("callback?code=test-code&state=" + url.searchParams.get("state"), {
      headers: { cookie },
    }),
    env,
    exchange as typeof fetch,
  );
  expect(callback.status).toBe(303);
  expect(callback.headers.get("Location")).toBe(
    env.APP_ORIGIN + "/?wearable=oura",
  );
  const cookies = callback.headers.getSetCookie();
  const auth = cookies
    .find((v) => v.startsWith("ws_oura_session="))!
    .split(";")[0];
  expect(auth).not.toContain("private-test-token");
  expect(auth).not.toContain("do-not-store");
  expect(
    await (
      await handleOura(request("status", { headers: { cookie: auth } }), env)
    ).json(),
  ).toEqual({ configured: true, connected: true });
  const date = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const api = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const u = new URL(String(input));
    expect(new Headers(init?.headers).get("User-Agent")).toBe("Elya/1.0");
    if (u.pathname.endsWith("sleep"))
      return Response.json({
        data: [
          {
            id: "sleep",
            day: date,
            bedtime_end: date + "T07:00:00+00:00",
            total_sleep_duration: 25200,
            type: "long_sleep",
          },
        ],
        next_token: null,
      });
    if (!u.searchParams.has("next_token"))
      return Response.json({ data: [], next_token: "page2" });
    return Response.json({
      data: [{ id: "activity", day: date, steps: 6000 }],
      next_token: null,
    });
  });
  const response = await handleOura(
    post("sync", auth),
    env,
    api as typeof fetch,
  );
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data.days).toEqual([{ date, sleepHours: 7, steps: 6000 }]);
  expect(JSON.stringify(data)).not.toContain("private-test-token");
  expect(api).toHaveBeenCalledTimes(3);
  const physiologyAPI = vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("daily_readiness"))
      return Response.json({
        data: [{ id: "r", day: date, temperature_deviation: 0.15 }],
        next_token: null,
      });
    if (path.endsWith("sleep"))
      return Response.json({
        data: [
          {
            id: "s",
            day: date,
            bedtime_end: date + "T07:00:00Z",
            total_sleep_duration: 25200,
            type: "long_sleep",
            average_heart_rate: 60,
            average_hrv: 45,
            average_breath: 14,
          },
        ],
        next_token: null,
      });
    return Response.json({
      data: [{ id: "a", day: date, steps: 6000 }],
      next_token: null,
    });
  });
  const physiological = await handleOura(
    post("physiology?timeZone=America%2FLos_Angeles", auth),
    env,
    physiologyAPI as typeof fetch,
  );
  const physiologicalData = await physiological.json();
  expect(physiological.status).toBe(200);
  expect(physiologicalData.days[0]).toMatchObject({
    kind: "real",
    hrvRmssdMs: 45,
    nightHeartRateBpm: 60,
    temperatureDeviationC: 0.15,
  });
  expect(physiologicalData.days[0].availableAt).toBe(
    physiologicalData.provenance.importedAt,
  );
  expect(JSON.stringify(physiologicalData)).not.toContain("private-test-token");
  expect(physiologyAPI).toHaveBeenCalledTimes(3);
  const disconnected = await handleOura(post("disconnect", auth), env);
  expect(disconnected.headers.get("Set-Cookie")).toContain("Max-Age=0");
});
it("reports incomplete imports as errors rather than returning partial data", async () => {
  const { url, cookie } = await begin();
  const callback = await handleOura(
    request("callback?code=c&state=" + url.searchParams.get("state"), {
      headers: { cookie },
    }),
    env,
    (async () =>
      Response.json({
        access_token: "token",
        expires_in: 1000,
        token_type: "bearer",
      })) as typeof fetch,
  );
  const auth = callback.headers
    .getSetCookie()
    .find((c) => c.startsWith("ws_oura_session="))!
    .split(";")[0];
  const response = await handleOura(
    post("sync", auth),
    env,
    (async () => new Response("unauthorized", { status: 401 })) as typeof fetch,
  );
  expect(response.status).toBe(401);
  expect((await response.json()).days).toBeUndefined();
});
