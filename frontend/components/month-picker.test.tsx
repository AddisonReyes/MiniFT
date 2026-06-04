import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MonthPicker } from "@/components/month-picker";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("MonthPicker", () => {
  it("renders the selected month and year", () => {
    render(<MonthPicker value="2026-05" onChange={() => {}} />);

    expect(screen.getByLabelText("budgets.month")).toHaveValue("05");
    expect(screen.getByLabelText("common.year")).toHaveValue("2026");
  });

  it("emits normalized values when month or year changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthPicker value="2026-05" onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("budgets.month"), "06");
    await user.selectOptions(screen.getByLabelText("common.year"), "2027");

    expect(onChange).toHaveBeenNthCalledWith(1, "2026-06");
    expect(onChange).toHaveBeenNthCalledWith(2, "2027-05");
  });
});
