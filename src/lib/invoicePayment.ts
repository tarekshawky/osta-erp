// Collection tracking for an invoice. Invoices created before paidAmount existed have paidAmount = 0 even when they were
// collected, so the amount received is derived here instead of read straight from the column: an invoice that was
// Paid (or later refunded) has received its full amount.

type PaymentFields = { amount: number; status: string; paidAmount: number };

const COLLECTED_STATUSES = ["Paid", "Refunded", "Partially Refunded"];
const round2 = (n: number) => Math.round(n * 100) / 100;

export function amountReceived(inv: PaymentFields): number {
  if (inv.paidAmount > 0) return Math.min(round2(inv.paidAmount), inv.amount);
  return COLLECTED_STATUSES.includes(inv.status) ? inv.amount : 0;
}

export function remainingBalance(inv: PaymentFields): number {
  return Math.max(0, round2(inv.amount - amountReceived(inv)));
}

export type PaymentState = "PAID" | "UNPAID" | "PARTIALLY PAID";

// What the stamp and the status filters show. Refunds are a separate concern and still count as having been paid.
export function paymentState(inv: PaymentFields): PaymentState {
  const received = amountReceived(inv);
  if (received <= 0) return "UNPAID";
  return received >= inv.amount - 0.005 ? "PAID" : "PARTIALLY PAID";
}

// The collection block shown on a saved invoice (stamp, payment date, paid amount, balance).
export function collectionOf(inv: { amount: number; status: string; paidAmount: number; paymentDate: Date | null; date: Date }) {
  const state = paymentState(inv);
  const received = amountReceived(inv);
  return {
    state,
    received,
    remaining: remainingBalance(inv),
    // Old invoices were collected when issued but never recorded when; show the invoice date, marked as an estimate.
    paymentDate: inv.paymentDate ?? (received > 0 ? inv.date : null),
    paymentDateIsEstimate: !inv.paymentDate && received > 0,
  };
}

export type PaymentPlan = { ok: true; paidAmount: number; status: "Paid" | "Unpaid"; received: number } | { ok: false; error: string };

// What recording a payment does to an invoice. Pure so the rules are tested: the amount must be positive and no more than
// the balance, and the invoice becomes Paid only when the whole amount has been received (a part payment keeps it Unpaid
// in `status` -- the PARTIALLY PAID label is derived from paidAmount).
export function planPayment(inv: PaymentFields, receivedNow: number): PaymentPlan {
  const amount = round2(receivedNow);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter the amount received." };
  const balance = remainingBalance(inv);
  if (balance <= 0) return { ok: false, error: "This invoice is already fully paid." };
  if (amount > balance + 0.005) return { ok: false, error: `The amount is more than the remaining balance (AED ${balance.toFixed(2)}).` };
  const paidAmount = round2(amountReceived(inv) + amount);
  return { ok: true, paidAmount: Math.min(paidAmount, inv.amount), status: paidAmount >= inv.amount - 0.005 ? "Paid" : "Unpaid", received: amount };
}
