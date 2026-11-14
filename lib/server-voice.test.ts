import { afterEach, it, expect, vi } from "vitest";
import { generateVoice, sameSpokenWords, voiceStatus } from "./server-voice";
const req = (body: unknown) =>
  new Request("https://example.test/api/voice", {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
afterEach(() => vi.unstubAllGlobals());
it("requires separate explicit consent before any voice provider request", async () => {
  const f = vi.fn();
  vi.stubGlobal("fetch", f);
  expect(
    (
      await generateVoice(
        req({ text: "Reply", voice: "coral", consent: false }),
        { OPENAI_API_KEY: "test" },
      )
    ).status,
  ).toBe(422);
  expect(f).not.toHaveBeenCalled();
});
it("exposes only setup status and an honest missing-key response", async () => {
  expect(await voiceStatus({ OPENAI_API_KEY: "secret" }).json()).toEqual({
    configured: true,
  });
  expect(
    (
      await generateVoice(
        req({ text: "Reply", voice: "coral", consent: true }),
        {},
      )
    ).status,
  ).toBe(503);
});
it("rejects any added medical claim or changed number before playing audio", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          choices: [
            {
              message: {
                audio: {
                  transcript: "You have endometriosis.",
                  data: btoa("fake audio"),
                },
              },
            },
          ],
        }),
      ),
  );
  expect(
    (
      await generateVoice(
        req({ text: "How long did it last?", voice: "sage", consent: true }),
        { OPENAI_API_KEY: "test" },
      )
    ).status,
  ).toBe(422);
  expect(
    sameSpokenWords("Pain was 3 out of 10.", "Pain was 8 out of 10."),
  ).toBe(false);
});
it("returns audio only if its transcript matches the approved reply", async () => {
  const f = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        choices: [
          {
            message: {
              audio: {
                transcript: "How long did it last?",
                data: btoa("audio"),
              },
            },
          },
        ],
      }),
    );
  vi.stubGlobal("fetch", f);
  const r = await generateVoice(
    req({ text: "How long did it last?", voice: "coral", consent: true }),
    { OPENAI_API_KEY: "test" },
  );
  expect(r.status).toBe(200);
  expect(r.headers.get("Content-Type")).toBe("audio/wav");
  const sent = JSON.parse(f.mock.calls[0][1].body);
  expect(sent.model).toBe("gpt-audio-1.5");
  expect(sent.audio.voice).toBe("coral");
  expect(sent.store).toBe(false);
});
