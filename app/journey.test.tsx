// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import { clearEntries, loadEntries } from "../lib/storage";
import { savePreferences, defaultPreferences } from "../lib/preferences";
beforeEach(async () => {
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
it("completes a manual entry with attributed fields and skips the optional question", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await waitFor(() =>
    expect(screen.queryByText("Opening your journal…")).toBeNull(),
  );
  await user.click(screen.getByRole("button", { name: "Write an entry" }));
  await user.type(
    screen.getByLabelText("Your words"),
    "My lower abdomen ached this morning.",
  );
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByText("ONE OPTIONAL QUESTION")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Add a detail" }));
  await user.type(
    screen.getByLabelText("Detail", { exact: true }),
    "Lower abdominal aching",
  );
  await user.type(
    screen.getByLabelText("Exact source quotation"),
    "My lower abdomen ached",
  );
  await user.click(screen.getByRole("button", { name: "Skip" }));
  await user.click(screen.getByRole("button", { name: "Save now" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((await loadEntries())[0].facts[0].quote).toBe(
    "My lower abdomen ached",
  );
  expect(screen.getByText("Your entry is saved on this device.")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Your story" }));
  expect(screen.getByText("My lower abdomen ached this morning.")).toBeTruthy();
});
it("keeps demo and personal records separate and gates report export behind review", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await waitFor(() =>
    expect(screen.queryByText("Opening your journal…")).toBeNull(),
  );
  await user.click(screen.getByRole("button", { name: "Try demo" }));
  await screen.findByRole("button", { name: "Exit demo" });
  await user.click(screen.getByRole("button", { name: "Appointment brief" }));
  const download = screen.getByRole("button", { name: "Download PDF" });
  expect((download as HTMLButtonElement).disabled).toBe(true);
  await user.click(
    screen.getByLabelText(
      "I have reviewed this brief and the supporting entries for accuracy.",
    ),
  );
  expect((download as HTMLButtonElement).disabled).toBe(false);
  await user.click(screen.getByRole("button", { name: "Exit demo" }));
  expect(
    screen.getByRole("heading", { name: "Add an entry to build your brief." }),
  ).toBeTruthy();
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

// Keep timing/context out of treatment evidence in the combined experience.
it("groups only interventions and treatment responses under what was tried", async () => {
  const { putEntry } = await import("../lib/storage");
  await putEntry({ id:"treatment-grouping", date:"2026-11-13", text:"I am not on my period. A heat pad helped.", symptomFree:false, demo:false, facts:[
    {kind:"Menstrual context",value:"Outside period",quote:"I am not on my period."},
    {kind:"What helped",value:"Heat pad",quote:"A heat pad helped."},
  ] });
  const user=userEvent.setup(); render(<Home />);
  await waitFor(()=>expect(screen.queryByText("Opening your journal…")).toBeNull());
  await user.click(screen.getByRole("button",{name:/^Appointment brief$/}));
  const section=screen.getByRole("heading",{name:"What I tried and what I noticed"}).parentElement!;
  expect(within(section).getByText(/A heat pad helped/)).toBeTruthy();
  expect(within(section).queryByText(/not on my period/)).toBeNull();
});
