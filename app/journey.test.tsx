// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import { navigate } from "./test-navigation";
import { clearEntries, loadEntries } from "../lib/storage";
import { savePreferences, defaultPreferences } from "../lib/preferences";
import { handleForecast } from "../lib/server-forecast";
beforeEach(async () => {
  window.history.replaceState(null, "", "/");
  localStorage.clear();
  vi.stubGlobal("fetch",vi.fn((url:string)=>handleForecast(new Request(new URL(url,"http://localhost").href))));
  await clearEntries();
  await savePreferences({ ...defaultPreferences, setupComplete: true });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("saves a confirmed entry, reviews it on the calendar, and edits without duplicating entries",async()=>{
 const user=userEvent.setup();render(<Home/>);await user.click(screen.getByRole("button",{name:"Check in today"}));
 await user.type(screen.getByLabelText("What are you experiencing today?"),"My lower abdomen ached this morning.");
 await user.selectOptions(screen.getByLabelText("Pelvic pain / cramps status"),"present");
 await user.click(screen.getByRole("button",{name:"Add to calendar"}));await screen.findByRole("heading",{name:"Today’s summary"});
 await user.click(screen.getByRole("button",{name:"Edit entry"}));await user.type(screen.getByLabelText("What are you experiencing today?")," I missed a walk.");
 await user.click(screen.getByRole("button",{name:"Save changes"}));await screen.findByRole("heading",{name:"Today’s summary"});
 const saved=await loadEntries();expect(saved).toHaveLength(1);expect(saved[0].text).toContain("I missed a walk.");expect(saved[0].facts[0].quote).toBe("I reported pelvic pain / cramps.");
});
it("requires review before exporting the selected fictional brief",async()=>{
 const user=userEvent.setup();render(<Home/>);await user.selectOptions(screen.getByLabelText("Fictional history"),"maya");
 await screen.findByText("Matching fictional outlook, journal and appointment history loaded. Personal records stay separate.");
 await navigate(user,"Appointment Brief");const print=screen.getByRole("button",{name:"Print / Save as PDF"}) as HTMLButtonElement;
 expect(print.disabled).toBe(true);await user.click(screen.getByRole("checkbox"));expect(print.disabled).toBe(false);
 expect(await loadEntries()).toHaveLength(0);
});
it("reloading a fictional history replaces stale demo dates and preserves personal records", async () => {
  const { replaceDemoEntries, putEntry } = await import("../lib/storage");
  const { personaEntries } = await import("../lib/demo");
  const es = personaEntries("maya");
  await putEntry({ ...es[0], id: "personal", demo: false, persona: undefined });
  await putEntry({ ...es[0], id: "stale-demo" });
  await replaceDemoEntries(es);
  const records = await loadEntries();
  expect(records.some((e) => e.id === "personal")).toBe(true);
  expect(records.some((e) => e.id === "stale-demo")).toBe(false);
  expect(records.filter((e) => e.demo)).toHaveLength(es.length);
});


it("keeps menstrual context out of the quoted treatment outcome section",async()=>{
 const {putEntry}=await import("../lib/storage");
 await putEntry({id:"treatment-grouping",date:"2026-11-13",text:"I am not on my period. A heat pad helped.",symptomFree:false,demo:false,facts:[{kind:"Menstrual context",value:"Outside period",quote:"I am not on my period."},{kind:"What helped",value:"Heat pad",quote:"A heat pad helped."}]});
 const user=userEvent.setup();render(<Home/>);await navigate(user,"Appointment Brief");
 const summary=(screen.getByLabelText("Recorded symptoms and daily life",{exact:false}) as HTMLTextAreaElement).value;
 expect(summary).toContain("A heat pad helped.");expect(summary).not.toContain("not on my period");
});
