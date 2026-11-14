// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import { clearPreferences, loadPreferences } from "../lib/preferences";
import { clearEntries } from "../lib/storage";
beforeEach(async () => {
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
it("opens Outlook directly and keeps personalization in Settings", async () => {
  const user = userEvent.setup();
  const app = render(<Home />);
  await screen.findByRole("heading", { name: "Tomorrow, a little more context." });
  expect(screen.queryByRole("button", { name: "Preview Coral" })).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Write an entry" }));
  expect(screen.queryByText("Find your voice.")).toBeNull();
  expect(screen.queryByRole("button", { name: "Preview Coral" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Close editor" }));
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
  await screen.findByRole("heading", { name: "Tomorrow, a little more context." });
  await user.click(screen.getByRole("button", { name: "Privacy settings" }));
  await user.type(
    screen.getByRole("textbox", { name: /What should we call you/ }),
    "Sam",
  );
  await user.click(screen.getByRole("radio", { name: /Talk it through/ }));
  await user.click(
    screen.getByRole("button", { name: "Save preferences" }),
  );
  await user.click(screen.getByRole("button", { name: "Close settings" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((await loadPreferences()).name).toBe("Sam");
  expect((await loadPreferences()).inputMode).toBe("voice");
  await user.click(screen.getByRole("button", { name: "Privacy settings" }));
  expect(
    (
      screen.getByRole("textbox", {
        name: /What should we call you/,
      }) as HTMLInputElement
    ).value,
  ).toBe("Sam");
  await user.click(screen.getByText("Voice & spoken replies", { exact: true }));
  expect(screen.getByRole("button", { name: "Preview Coral" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Close settings" }));
  app.unmount();
  render(<Home />);
  await screen.findByText(/Sam’s journal/);
  expect(screen.queryByRole("heading", { name: "Set up elya." })).toBeNull();
});
