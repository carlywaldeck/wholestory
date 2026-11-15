// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import {clearLearningData} from "../lib/learning-store";
import {runLearningTask} from "../lib/learning-client";
import {executeTestLearning} from "../tests/learning-executor";
vi.mock("../lib/learning-client",async()=>{const {executeTestLearning}=await import("../tests/learning-executor");return {runLearningTask:vi.fn(executeTestLearning)};});
import { navigate } from "./test-navigation";
import { clearPreferences, loadPreferences, savePreferences, defaultPreferences } from "../lib/preferences";
import { clearEntries } from "../lib/storage";
beforeEach(async()=>{await clearLearningData();vi.mocked(runLearningTask).mockImplementation(executeTestLearning);
  window.history.replaceState(null, "", "/outlook");
  await clearPreferences();
  await clearEntries();
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ configured: false })),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("opens the animated home with Journal and toggleable symptom bubbles below it", async()=>{
  window.history.replaceState(null,"","/");
  const user=userEvent.setup();render(<Home/>);
  await screen.findByRole("heading",{name:"Welcome. How are you feeling today?"});
  expect(document.getElementById("home-journal")?.querySelector("#linen-entry")).toBeTruthy();
  const journal=document.querySelector("#home-journal .journal-panel")!;
  const outlook=document.getElementById("home-outlook")!;
  const brief=document.getElementById("home-appointment-brief")!;
  expect(journal.compareDocumentPosition(outlook)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(outlook.compareDocumentPosition(brief)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const bubble=screen.getByRole("button",{name:"Fatigue"});
  expect(bubble.getAttribute("aria-pressed")).toBe("false");
  await user.click(bubble);expect(bubble.getAttribute("aria-pressed")).toBe("true");
  await user.click(bubble);expect(bubble.getAttribute("aria-pressed")).toBe("false");
  expect(window.location.pathname).toBe("/");
});
it("uses the saved name in the home greeting", async()=>{
  window.history.replaceState(null,"","/");
  await savePreferences({...defaultPreferences,name:"Alexis"});
  render(<Home/>);
  await screen.findByRole("heading",{name:"Welcome, Alexis. How are you feeling today?"});
});
it("opens Outlook and keeps personalization in Settings", async () => {
  const user = userEvent.setup();
  const app = render(<Home />);
  await screen.findByRole("heading", { name: "Today’s summary" });
  expect(screen.queryByRole("button", { name: "Preview Coral" })).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
  await navigate(user, "Outlook");
  await user.click(screen.getByRole("button", { name: "Check in today" }));
  expect(screen.queryByText("Find your voice.")).toBeNull();
  expect(screen.queryByRole("button", { name: "Preview Coral" })).toBeNull();
  expect(screen.getByLabelText("What are you experiencing today?")).toBeTruthy();
  app.unmount();
  render(<Home />);
  await waitFor(() =>
    expect(screen.queryByText("Opening your journal…")).toBeNull(),
  );
  expect(screen.queryByRole("heading", { name: "Set up elya." })).toBeNull();
});
it("saves a name and entry preference, then restores them without onboarding", async () => {
  const user = userEvent.setup();
  const app = render(<Home />);
  await screen.findByRole("heading", { name: "Today’s summary" });
  await navigate(user, "Settings");
  await user.type(
    screen.getByRole("textbox", { name: /What should we call you/ }),
    "Sam",
  );
  await user.click(screen.getByRole("radio", { name: "Talk" }));
  await waitFor(()=>expect(screen.getByText("Saved automatically.")).toBeTruthy());
  await user.click(screen.getByRole("button", { name: "Close settings" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((await loadPreferences()).name).toBe("Sam");
  expect((await loadPreferences()).inputMode).toBe("voice");
  await navigate(user, "Settings");
  expect(
    (
      screen.getByRole("textbox", {
        name: /What should we call you/,
      }) as HTMLInputElement
    ).value,
  ).toBe("Sam");
  await user.click(screen.getByRole("button", { name: /Voice and replies/ }));
  expect(screen.getByRole("button", { name: "Play sample" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Close settings" }));
  app.unmount();
  render(<Home />);
  await navigate(user, "Settings");
  expect((screen.getByRole("textbox", { name: /What should we call you/ }) as HTMLInputElement).value).toBe("Sam");
  expect(screen.queryByRole("heading", { name: "Set up elya." })).toBeNull();
});
