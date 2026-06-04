import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PasswordInput } from "@/components/password-input";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("PasswordInput", () => {
  it("renders a hidden password field by default", () => {
    render(<PasswordInput aria-label="Password" />);

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "auth.viewPassword" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" />);

    await user.click(screen.getByRole("button", { name: "auth.viewPassword" }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "auth.hidePassword" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
