// @vitest-environment jsdom
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { useSpokenReplies } from "./use-spoken-replies";
class AudioMock {
  static instances: AudioMock[] = [];
  src: string;
  playbackRate = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  constructor(src: string) {
    this.src = src;
    AudioMock.instances.push(this);
  }
}
const OriginalURL = URL;
let request: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  AudioMock.instances = [];
  vi.stubGlobal("Audio", AudioMock);
  vi.stubGlobal(
    "URL",
    class extends OriginalURL {
      static createObjectURL = vi.fn(() => "blob:reply");
      static revokeObjectURL = vi.fn();
    },
  );
  request = vi.fn(async (_url: string, options?: RequestInit) =>
    options?.method === "POST"
      ? new Response(new Blob(["audio"], { type: "audio/wav" }))
      : Response.json({ configured: true }),
  );
  vi.stubGlobal("fetch", request);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("does not play a system voice or send text before consent", async () => {
  const { result } = renderHook(useSpokenReplies);
  await waitFor(() => expect(result.current.configured).toBe(true));
  await act(async () => {
    await result.current.speak("Private text", true);
  });
  expect(AudioMock.instances).toHaveLength(0);
  act(() => result.current.chooseVoice("coral"));
  await act(async () => {
    await result.current.speak("Private text", true);
  });
  expect(
    request.mock.calls.filter((c) => c[1]?.method === "POST"),
  ).toHaveLength(0);
  expect(result.current.speechError).toContain("consent");
});
it("plays official AI previews without an API key or journal transmission", async () => {
  request.mockResolvedValue(Response.json({ configured: false }));
  const { result } = renderHook(useSpokenReplies);
  await waitFor(() => expect(result.current.configured).toBe(false));
  act(() => result.current.preview("coral"));
  expect(AudioMock.instances[0].src).toBe(
    "https://cdn.openai.com/API/docs/audio/coral.wav",
  );
  expect(result.current.enabled).toBe(false);
  expect(
    request.mock.calls.filter((c) => c[1]?.method === "POST"),
  ).toHaveLength(0);
});
it("uses the exact selected natural voice after separate consent", async () => {
  const { result } = renderHook(useSpokenReplies);
  await waitFor(() => expect(result.current.configured).toBe(true));
  act(() => {
    result.current.setConsent(true);
    result.current.chooseVoice("sage");
  });
  await act(async () => {
    await result.current.speak("One optional question. How long did it last?");
  });
  const post = request.mock.calls.find((c) => c[1]?.method === "POST")!;
  expect(JSON.parse(post[1].body as string)).toEqual({
    text: "One optional question. How long did it last?",
    voice: "sage",
    consent: true,
  });
  expect(AudioMock.instances[0].src).toBe("blob:reply");
  expect(result.current.speaking).toBe(true);
});
it("muting blocks callbacks captured before mute and stops existing playback", async () => {
  const { result } = renderHook(useSpokenReplies);
  await waitFor(() => expect(result.current.configured).toBe(true));
  act(() => {
    result.current.setConsent(true);
    result.current.chooseVoice("coral");
    result.current.preview("coral");
  });
  const pendingSpeak = result.current.speak;
  act(() => result.current.setEnabled(false));
  await act(async () => {
    await pendingSpeak("Late reply");
  });
  expect(AudioMock.instances[0].pause).toHaveBeenCalled();
  expect(
    request.mock.calls.filter((c) => c[1]?.method === "POST"),
  ).toHaveLength(0);
});
it("remembers only the natural voice choice and starts each session muted", async () => {
  localStorage.setItem("wholestory.naturalVoice", "alloy");
  const { result } = renderHook(useSpokenReplies);
  await waitFor(() => expect(result.current.selectedVoice).toBe("alloy"));
  expect(result.current.enabled).toBe(false);
  expect(result.current.consent).toBe(false);
});
it("never falls back to a system voice when the natural provider fails", async () => {
  const { result } = renderHook(useSpokenReplies);
  await waitFor(() => expect(result.current.configured).toBe(true));
  act(() => {
    result.current.setConsent(true);
    result.current.chooseVoice("coral");
  });
  request.mockResolvedValueOnce(
    Response.json({ error: "Provider unavailable" }, { status: 422 }),
  );
  await act(async () => {
    await result.current.speak("Reply");
  });
  expect(result.current.speechError).toBe("Provider unavailable");
  expect(AudioMock.instances).toHaveLength(0);
  expect(result.current.preparing).toBe(false);
});
it("cancels pending generation when speech is stopped", async () => {
  const { result } = renderHook(useSpokenReplies);
  await waitFor(() => expect(result.current.configured).toBe(true));
  act(() => {
    result.current.setConsent(true);
    result.current.chooseVoice("coral");
  });
  let resolve!: (r: Response) => void;
  request.mockImplementationOnce(
    () =>
      new Promise<Response>((r) => {
        resolve = r;
      }),
  );
  let speaking: Promise<void>;
  act(() => {
    speaking = result.current.speak("Reply");
  });
  act(() => result.current.stop());
  await act(async () => {
    resolve(new Response(new Blob(["audio"])));
    await speaking!;
  });
  expect(AudioMock.instances).toHaveLength(0);
  expect(result.current.speaking).toBe(false);
});
