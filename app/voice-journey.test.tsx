// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import {clearLearningData} from "../lib/learning-store";
import {runLearningTask} from "../lib/learning-client";
import {executeTestLearning} from "../tests/learning-executor";
vi.mock("../lib/learning-client",async()=>{const {executeTestLearning}=await import("../tests/learning-executor");return {runLearningTask:vi.fn(executeTestLearning)};});
import { navigate } from "./test-navigation";
import { clearEntries, loadEntries } from "../lib/storage";
import { savePreferences, defaultPreferences } from "../lib/preferences";
class Recognition {
  static instances: Recognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start = vi.fn(()=>this.onstart?.());
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
class AudioMock {
  src: string;
  playbackRate = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  constructor(src: string) {
    this.src = src;
  }
}
const OriginalURL = URL;
let voiceFetch: ReturnType<typeof vi.fn>;
beforeEach(async()=>{await clearLearningData();vi.mocked(runLearningTask).mockImplementation(executeTestLearning);
  window.history.replaceState(null, "", "/outlook");
  await clearEntries();
  await savePreferences({ ...defaultPreferences, setupComplete: true });
  localStorage.clear();
  Recognition.instances = [];
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("SpeechRecognition", Recognition);
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("Audio", AudioMock);
  vi.stubGlobal(
    "URL",
    class extends OriginalURL {
      static createObjectURL = vi.fn(() => "blob:reply");
      static revokeObjectURL = vi.fn();
    },
  );
  voiceFetch = vi.fn(async (_url: string, options?: RequestInit) =>
    options?.method === "POST"
      ? new Response(new Blob(["audio"], { type: "audio/wav" }))
      : Response.json({ configured: true }),
  );
  vi.stubGlobal("fetch", voiceFetch);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("records only after Speak, keeps the transcript editable, and saves without automatic replies", async () => {
 const user=userEvent.setup();render(<Home/>);await navigate(user,"Journal");
 expect(Recognition.instances).toHaveLength(0);
 await user.type(screen.getByLabelText("What are you experiencing today?"),"My original note.");
 await user.click(screen.getByRole("button",{name:"Speak"}));
 expect(Recognition.instances).toHaveLength(1);expect(Recognition.instances[0].start).toHaveBeenCalledOnce();
 act(()=>Recognition.instances[0].onresult?.({results:[[{transcript:"Fictional cramping interrupted my walk."}]]}));
 await user.type(screen.getByLabelText("What are you experiencing today?")," My correction.");
 act(()=>Recognition.instances[0].onresult?.({results:[[{transcript:"Fictional cramping interrupted my walk."}],[{transcript:"Second dictated sentence."}]]}));
 await user.click(screen.getByRole("button",{name:"Stop recording"}));
 expect((screen.getByLabelText("What are you experiencing today?") as HTMLTextAreaElement).value).toContain("Fictional cramping");
 await user.click(screen.getByRole("button",{name:"Pelvic pain / cramps"}));
 await user.click(screen.getByRole("button",{name:"Add to calendar"}));
 await screen.findByRole("heading",{name:"Today’s summary"});
 expect((await loadEntries())[0].text).toContain("Fictional cramping interrupted my walk.");
 expect((await loadEntries())[0].text).toContain("My original note.");expect((await loadEntries())[0].text).toContain("My correction.");expect((await loadEntries())[0].text.match(/Fictional cramping/g)).toHaveLength(1);
 expect(voiceFetch.mock.calls.filter(c=>c[1]?.method==="POST")).toHaveLength(0);
});
