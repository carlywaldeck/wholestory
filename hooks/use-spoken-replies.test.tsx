// @vitest-environment jsdom
import { renderHook, act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { useSpokenReplies } from "./use-spoken-replies";
class Utterance {
  text: string;
  voice: unknown = null;
  rate = 1;
  lang = "";
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}
const local = {
  voiceURI: "local",
  name: "Local English",
  lang: "en-US",
  localService: true,
};
const remote = {
  voiceURI: "remote",
  name: "Remote English",
  lang: "en-US",
  localService: false,
};
let synth: {
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  getVoices: () => unknown[];
};
beforeEach(() => {
  localStorage.clear();
  synth = { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [remote, local] };
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("never chooses a default voice or speaks before the user chooses", () => {
  const { result } = renderHook(useSpokenReplies);
  act(() => result.current.speak("Private journal text"));
  act(() => result.current.setEnabled(true));
  expect(synth.speak).not.toHaveBeenCalled();
  expect(result.current.enabled).toBe(false);
  expect(result.current.speechError).toContain("Choose");
});
it("previews without enabling replies, then uses the exact chosen voice", () => {
  const { result } = renderHook(useSpokenReplies);
  act(() => result.current.preview("remote"));
  expect(synth.speak.mock.calls[0][0].voice).toBe(remote);
  expect(result.current.enabled).toBe(false);
  act(() => result.current.chooseVoice("local"));
  act(() =>
    result.current.speak("One optional question. How long did it last?"),
  );
  const u = synth.speak.mock.calls[1][0];
  expect(u.voice).toBe(local);
  expect(result.current.speaking).toBe(true);
  act(() => u.onend());
  expect(result.current.speaking).toBe(false);
});
it("cancels prior replies and never falls back when a chosen voice disappears", () => {
  const { result } = renderHook(useSpokenReplies);
  act(() => result.current.chooseVoice("local"));
  act(() => result.current.speak("First"));
  const first = synth.speak.mock.calls[0][0];
  act(() => result.current.speak("Second"));
  expect(first.onend).toBeNull();
  expect(synth.cancel).toHaveBeenCalled();
  synth.getVoices = () => [remote];
  act(() => result.current.speak("Third"));
  expect(synth.speak).toHaveBeenCalledTimes(2);
  expect(result.current.speechError).toContain("not switch you");
});
it("muting blocks even callbacks captured before mute", () => {
  const { result, unmount } = renderHook(useSpokenReplies);
  act(() => result.current.chooseVoice("local"));
  const pendingSpeak = result.current.speak;
  act(() => result.current.setEnabled(false));
  act(() => pendingSpeak("A late reply"));
  expect(synth.speak).not.toHaveBeenCalled();
  unmount();
  expect(synth.cancel).toHaveBeenCalled();
});
it("remembers the choice but starts the next session muted", () => {
  localStorage.setItem("wholestory.voice", "local");
  const { result } = renderHook(useSpokenReplies);
  expect(result.current.selectedVoice).toBe("local");
  expect(result.current.enabled).toBe(false);
});
it("falls back to visible text if synthesis is unavailable", () => {
  vi.stubGlobal("speechSynthesis", undefined);
  const { result } = renderHook(useSpokenReplies);
  act(() => result.current.preview("local"));
  expect(result.current.speechError).toContain("unavailable");
  expect(result.current.speaking).toBe(false);
});

it("offers conversational choices before novelty system voices", () => {
  synth.getVoices = () => [
    { ...local, voiceURI: "albert", name: "Albert" },
    { ...local, voiceURI: "samantha", name: "Samantha" },
    { ...local, voiceURI: "karen", name: "Karen" },
  ];
  const { result } = renderHook(useSpokenReplies);
  expect(result.current.voices.map((v) => v.name)).toEqual([
    "Samantha",
    "Karen",
  ]);
  expect(result.current.selectedVoice).toBe("");
});
