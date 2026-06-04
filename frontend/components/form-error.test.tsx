import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FormError } from "@/components/form-error";
import { ApiError } from "@/lib/api";

vi.mock("react-i18next", () => ({
  initReactI18next: {
    init: () => {},
    type: "3rdParty",
  },
}));

describe("FormError", () => {
  it("renders nothing without an error", () => {
    const { container } = render(
      <FormError error={null} fallbackMessage="Something went wrong" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders API error messages", () => {
    render(
      <FormError
        error={new ApiError("Invalid credentials", 401)}
        fallbackMessage="Something went wrong"
      />,
    );

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("renders fallback text for unknown errors", () => {
    render(
      <FormError error="unexpected" fallbackMessage="Something went wrong" />,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
