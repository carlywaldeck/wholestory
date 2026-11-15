import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
export async function navigate(user: ReturnType<typeof userEvent.setup>, label: string) {
  const button = screen.getByRole("button", { name: "Menu" });
  if (button.getAttribute("aria-expanded") !== "true") await user.click(button);
  await user.click(screen.getByRole("link", { name: label }));
}
