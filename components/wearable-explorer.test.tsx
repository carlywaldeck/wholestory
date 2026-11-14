// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WearableExplorer } from "./wearable-explorer";
import { clearWearables, loadCheckIn, loadWearables } from "../lib/wearables";
import { personaEntries } from "../lib/demo";
beforeEach(clearWearables);
afterEach(cleanup);
it("shows a constructed comparison, opens source entries, and adds a labeled takeaway", async () => {
  const user = userEvent.setup(),
    evidence = vi.fn(),
    include = vi.fn();
  render(
    <WearableExplorer
      entries={personaEntries("maya")}
      demo
      onDemo={() => {}}
      onEvidence={evidence}
      onInclude={include}
    />,
  );
  expect(screen.getByText(/Intentionally constructed examples/)).toBeTruthy();
  await user.click(screen.getByRole("button", { name: /^Activity$/ }));
  await user.click(screen.getByRole("button", { name: /Use this comparison/ }));
  expect(include.mock.calls[0][0]).toContain("SYNTHETIC DEMO");
  expect(include.mock.calls[0][0]).toContain("Step count");
  await user.click(screen.getByText("See the days behind this comparison"));
  await user.click(
    screen.getAllByRole("button", { name: /Daily-life impact/ })[0],
  );
  expect(evidence.mock.calls[0][0].length).toBeGreaterThan(0);
  await user.click(screen.getByRole("button", { name: /Plan a check-in/ }));
  await user.type(
    screen.getByLabelText(/What would you like to notice/),
    "How rested I feel",
  );
  await user.click(screen.getByRole("button", { name: "Save check-in" }));
  await waitFor(() =>
    expect(screen.getByText(/Check-in saved on this device/)).toBeTruthy(),
  );
  expect((await loadCheckIn())?.note).toBe("How rested I feel");
});
it("imports local records and leaves prior records intact on invalid input", async () => {
  const user = userEvent.setup();
  render(
    <WearableExplorer
      entries={[]}
      demo={false}
      onDemo={() => {}}
      onEvidence={() => {}}
      onInclude={() => {}}
    />,
  );
  await user.click(screen.getByText("Import sleep & activity"));
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "Choose CSV" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  const good = new File([""], "daily.csv", { type: "text/csv" });
  Object.defineProperty(good, "text", {
    value: async () => "date,sleep_hours,steps\n2026-11-01,7,4000",
  });
  await user.upload(input, good);
  await screen.findByText(/Imported 1 daily records/);
  expect((await loadWearables()).days).toHaveLength(1);
  const bad = new File([""], "invalid.csv", { type: "text/csv" });
  Object.defineProperty(bad, "text", { value: async () => "invalid" });
  await user.upload(input, bad);
  await screen.findByRole("alert");
  expect((await loadWearables()).days).toHaveLength(1);
});
