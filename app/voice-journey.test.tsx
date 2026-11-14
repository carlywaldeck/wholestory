// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import { clearEntries, loadEntries } from "../lib/storage";
class Recognition {
  static instances: Recognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start = vi.fn();
  stop = () => this.onend?.();
  abort = vi.fn();
  constructor() {
    Recognition.instances.push(this);
  }
}
class Utterance {
  text: string;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}
const synth = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: () => [
    {
      voiceURI: "test-voice",
      name: "Test voice",
      lang: "en-US",
      localService: true,
    },
  ],
};
beforeEach(async () => {
  await clearEntries();
  localStorage.clear();
  Recognition.instances = [];
  synth.speak.mockClear();
  synth.cancel.mockClear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("SpeechRecognition", Recognition);
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  vi.stubGlobal("speechSynthesis", synth);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("reads one follow-up aloud, records its answer, and saves both without feedback", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await waitFor(() =>
    expect(screen.queryByText("Opening your journal…")).toBeNull(),
  );
  await user.click(
    screen.getByRole("button", { name: "Create a voice entry" }),
  );
  await user.selectOptions(screen.getByLabelText("Reply voice"), "test-voice");
  await user.click(screen.getByRole("button", { name: "Preview voice" }));
  expect(synth.speak.mock.calls[0][0].text).toContain("tell your story");
  await user.click(screen.getByRole("button", { name: "Use this voice" }));
  synth.speak.mockClear();
  await user.click(screen.getByRole("button", { name: "Start recording" }));
  expect(screen.getByText("Listening to your entry…")).toBeTruthy();
  const entryMic = Recognition.instances[0];
  expect(entryMic.start).toHaveBeenCalled();
  expect(synth.speak).not.toHaveBeenCalled();
  act(() =>
    entryMic.onresult?.({
      results: [[{ transcript: "My lower abdomen hurt this morning." }]],
    }),
  );
  await user.click(screen.getByRole("button", { name: "Stop recording" }));
  await user.click(screen.getByRole("button", { name: /Review manually/ }));
  const spoken = synth.speak.mock.calls.map((call) => call[0].text as string);
  expect(
    spoken.filter((t) => t.includes("Did the symptoms interfere")),
  ).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Answer by voice" }));
  const answerMic = Recognition.instances[1];
  expect(synth.cancel).toHaveBeenCalled();
  act(() =>
    answerMic.onresult?.({
      results: [[{ transcript: "I missed my first class." }]],
    }),
  );
  await user.click(
    screen.getByRole("button", { name: "Stop answer recording" }),
  );
  expect(
    (
      screen.getByPlaceholderText(
        "A few words, if you’d like…",
      ) as HTMLTextAreaElement
    ).value,
  ).toBe("I missed my first class.");
  expect(
    (screen.getByLabelText("Your words") as HTMLTextAreaElement).value,
  ).toBe("My lower abdomen hurt this morning.");
  await user.click(screen.getByRole("button", { name: "Save entry" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const [saved] = await loadEntries();
  expect(saved.text).toContain("I missed my first class.");
  expect(saved.text).toContain("Follow-up: Did the symptoms interfere");
});
