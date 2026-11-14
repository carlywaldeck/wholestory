// @vitest-environment jsdom
import { afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StructuredDetails } from "./structured-details";
import { validateEntry } from "../lib/model";
afterEach(cleanup);
it("turns explicit form answers into verifiable quoted facts without inventing unknowns", async () => {
  const user = userEvent.setup(),
    onAdd = vi.fn();
  render(<StructuredDetails date="2026-11-13" onAdd={onAdd} />);
  await user.click(
    screen.getByText("Prefer a form? Add optional cycle & symptom details"),
  );
  await user.type(screen.getByLabelText("Cycle day"), "3");
  await user.type(screen.getByLabelText("Pain score (0–10)"), "7");
  await user.click(screen.getByLabelText("Pain with bowel movements"));
  await user.click(
    screen.getByRole("button", { name: "Add these details to my entry" }),
  );
  const [facts, text] = onAdd.mock.calls[0];
  expect(() =>
    validateEntry({
      id: "form",
      date: "2026-11-13",
      facts,
      text,
      demo: false,
      symptomFree: false,
    }),
  ).not.toThrow();
  expect(facts.some((f: { kind: string }) => f.kind === "Cycle start")).toBe(
    false,
  );
  expect(text).toContain("I rate my pain 7/10.");
  expect(text).toContain("I had pain with bowel movements.");
});
it("rejects scores outside the range", async () => {
  const user = userEvent.setup(),
    onAdd = vi.fn();
  render(<StructuredDetails date="2026-11-13" onAdd={onAdd} />);
  await user.click(
    screen.getByText("Prefer a form? Add optional cycle & symptom details"),
  );
  await user.type(screen.getByLabelText("Pain score (0–10)"), "15");
  await user.click(
    screen.getByRole("button", { name: "Add these details to my entry" }),
  );
  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toContain("0 to 10");
});
