import type { Transaction } from "@/lib/types";

export function transactionTone(displayType: Transaction["display_type"]) {
  switch (displayType) {
    case "income":
      return "success";
    case "expense":
      return "danger";
    default:
      return "amber";
  }
}

export function transactionAmountClass(
  displayType: Transaction["display_type"],
) {
  switch (displayType) {
    case "income":
      return "text-signal";
    case "expense":
      return "text-hazard";
    default:
      return "text-amber";
  }
}
