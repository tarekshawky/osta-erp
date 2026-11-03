import { describe, it, expect, vi } from "vitest";

vi.mock("./prisma", () => ({ prisma: {} }));

import { invoiceStatusFilter } from "./invoiceCollections";

describe("invoice status filter", () => {
  it("All Invoices applies no filter", () => expect(invoiceStatusFilter("all")).toEqual({}));
  it("Unpaid means nothing received, Partially Paid means open with something received", () => {
    expect(invoiceStatusFilter("Unpaid")).toEqual({ status: "Unpaid", paidAmount: 0 });
    expect(invoiceStatusFilter("PartiallyPaid")).toEqual({ status: "Unpaid", paidAmount: { gt: 0 } });
  });
  it("other values are the stored statuses", () => expect(invoiceStatusFilter("Paid")).toEqual({ status: "Paid" }));
});
