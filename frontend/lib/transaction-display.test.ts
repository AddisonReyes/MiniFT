import { describe, expect, it } from "vitest";

import {
  transactionAmountClass,
  transactionTone,
} from "@/lib/transaction-display";

describe("transaction display helpers", () => {
  it("maps transaction types to badge tones", () => {
    expect(transactionTone("income")).toBe("success");
    expect(transactionTone("expense")).toBe("danger");
    expect(transactionTone("transfer")).toBe("amber");
  });

  it("maps transaction types to amount classes", () => {
    expect(transactionAmountClass("income")).toBe("text-signal");
    expect(transactionAmountClass("expense")).toBe("text-hazard");
    expect(transactionAmountClass("transfer")).toBe("text-amber");
  });
});
