import { describe, it, expect } from "vitest";
import { amountReceived, paymentState, remainingBalance } from "./invoicePayment";

describe("invoice collection tracking", () => {
  it("treats an old Paid invoice (paidAmount 0) as fully received", () => {
    const inv = { amount: 500, status: "Paid", paidAmount: 0 };
    expect(amountReceived(inv)).toBe(500);
    expect(remainingBalance(inv)).toBe(0);
    expect(paymentState(inv)).toBe("PAID");
  });
  it("an Unpaid invoice has received nothing", () => {
    const inv = { amount: 500, status: "Unpaid", paidAmount: 0 };
    expect(remainingBalance(inv)).toBe(500);
    expect(paymentState(inv)).toBe("UNPAID");
  });
  it("a part payment is PARTIALLY PAID with the right balance", () => {
    const inv = { amount: 500, status: "Unpaid", paidAmount: 200 };
    expect(amountReceived(inv)).toBe(200);
    expect(remainingBalance(inv)).toBe(300);
    expect(paymentState(inv)).toBe("PARTIALLY PAID");
  });
  it("never reports more received than the invoice amount, and refunded invoices were still paid", () => {
    expect(amountReceived({ amount: 100, status: "Paid", paidAmount: 150 })).toBe(100);
    expect(paymentState({ amount: 100, status: "Refunded", paidAmount: 0 })).toBe("PAID");
  });
});

import { planPayment } from "./invoicePayment";

describe("recording a payment", () => {
  const inv = { amount: 500, status: "Unpaid", paidAmount: 0 };
  it("a full payment makes the invoice Paid", () => expect(planPayment(inv, 500)).toEqual({ ok: true, paidAmount: 500, status: "Paid", received: 500 }));
  it("a part payment keeps it Unpaid with the amount received so far", () => {
    const first = planPayment(inv, 200);
    expect(first).toEqual({ ok: true, paidAmount: 200, status: "Unpaid", received: 200 });
    expect(planPayment({ ...inv, paidAmount: 200 }, 300)).toMatchObject({ ok: true, paidAmount: 500, status: "Paid" });
  });
  it("rejects zero, negative, too much, and paying an already paid invoice", () => {
    expect(planPayment(inv, 0).ok).toBe(false);
    expect(planPayment(inv, -5).ok).toBe(false);
    expect(planPayment(inv, 500.5).ok).toBe(false);
    expect(planPayment({ amount: 500, status: "Paid", paidAmount: 0 }, 10).ok).toBe(false);
  });
});

import { collectedOf } from "./invoicePayment";

describe("collected revenue per invoice", () => {
  it("counts what was received on a part-paid invoice, nothing on an untouched unpaid one, and amount less refunds otherwise", () => {
    expect(collectedOf({ amount: 500, refundedAmount: 0, status: "Unpaid", paidAmount: 200 })).toBe(200);
    expect(collectedOf({ amount: 500, refundedAmount: 0, status: "Unpaid", paidAmount: 0 })).toBe(0);
    expect(collectedOf({ amount: 500, refundedAmount: 100, status: "Partially Refunded", paidAmount: 500 })).toBe(400);
    expect(collectedOf({ amount: 500, refundedAmount: 0, status: "Paid", paidAmount: 0 })).toBe(500);
  });
});
