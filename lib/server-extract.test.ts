import { it, expect, vi, afterEach } from "vitest";
import { extract } from "./server-extract";
const req = (body: unknown) =>
  new Request("https://example.test/api/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://example.test",
    },
    body: JSON.stringify(body),
  });
afterEach(() => vi.unstubAllGlobals());
it("does not call a provider without consent", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(
    (
      await extract(req({ text: "Pain", consent: false }), {
        OPENAI_API_KEY: "test",
      })
    ).status,
  ).toBe(422);
  expect(fetch).not.toHaveBeenCalled();
});
it("returns an explicit no-key manual fallback", async () => {
  const r = await extract(req({ text: "Pain", consent: true }), {});
  expect(r.status).toBe(503);
  expect((await r.json()).error).toContain("manually");
});
it("rejects invented source text from provider", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    facts: [
                      {
                        kind: "Pelvic pain",
                        value: "Severe",
                        quote: "Severe pain",
                      },
                    ],
                    symptomFree: false,
                    followUp: null,
                  }),
                },
              ],
            },
          ],
        }),
      ),
  );
  expect(
    (
      await extract(req({ text: "Pain", consent: true }), {
        OPENAI_API_KEY: "test",
      })
    ).status,
  ).toBe(422);
});
it("accepts validated provider output and disables provider storage", async () => {
  const f = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  facts: [
                    { kind: "Pelvic pain", value: "Pain", quote: "Pain" },
                  ],
                  symptomFree: false,
                  followUp: null,
                }),
              },
            ],
          },
        ],
      }),
    );
  vi.stubGlobal("fetch", f);
  const r = await extract(req({ text: "Pain", consent: true }), {
    OPENAI_API_KEY: "test",
  });
  expect(r.status).toBe(200);
  expect(JSON.parse(f.mock.calls[0][1].body).store).toBe(false);
});
