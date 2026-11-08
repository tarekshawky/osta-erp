import { describe, it, expect } from "vitest";
import { ALTERNATIVE_ARRANGEMENT, allowedActions, displayStatus, expiryFrom, paymentProblem, tabOf, TABS } from "./workflow";

const past = new Date(Date.now() - 864e5);
const future = new Date(Date.now() + 864e5 * 100);
const can = (status: string, expiryDate: Date | null = null) => allowedActions({ status, expiryDate });

describe("agreement status", () => {
  it("an active agreement whose end date has passed is Expired, nothing else expires by itself", () => {
    expect(displayStatus({ status: "ACTIVE", expiryDate: past })).toBe("EXPIRED");
    expect(displayStatus({ status: "ACTIVE", expiryDate: future })).toBe("ACTIVE");
    expect(displayStatus({ status: "CANCELLED", expiryDate: past })).toBe("CANCELLED");
    expect(displayStatus({ status: "nonsense", expiryDate: null })).toBe("PENDING_APPROVAL");
  });
  it("every agreement lands in exactly one of the admin's tabs", () => {
    const keys = TABS.map((t) => t.key);
    expect(keys).toEqual(["all", "draft", "pending", "payment", "active", "suspended", "expired", "cancelled", "rejected"]);
    const cases: [string, Date | null, string][] = [["DRAFT", null, "draft"], ["PENDING_APPROVAL", null, "pending"], ["CHANGES_REQUESTED", null, "pending"], ["AWAITING_PAYMENT", null, "payment"], ["ACTIVE", future, "active"], ["ACTIVE", past, "expired"], ["SUSPENDED", future, "suspended"], ["SUSPENDED", past, "expired"], ["CANCELLED", null, "cancelled"], ["REJECTED", null, "rejected"]];
    for (const [status, expiryDate, tab] of cases) expect(tabOf({ status, expiryDate })).toBe(tab);
  });
});

describe("what the admin may do at each step", () => {
  it("only an agreement the customer has sent can be approved, and payment can be recorded only AFTER approval", () => {
    expect(can("PENDING_APPROVAL").has("approve")).toBe(true);
    expect(can("PENDING_APPROVAL").has("recordPayment")).toBe(false); // never activated before it is approved and its link issued
    expect(can("DRAFT").has("approve")).toBe(false); // the customer has not accepted it yet
    expect(can("AWAITING_PAYMENT").has("recordPayment")).toBe(true);
    expect(can("AWAITING_PAYMENT").has("approve")).toBe(false);
  });
  it("the admin can record an acceptance given outside the website only while the customer has not accepted", () => {
    expect(can("DRAFT").has("recordAcceptance")).toBe(true);
    for (const s of ["PENDING_APPROVAL", "AWAITING_PAYMENT", "REJECTED"]) expect(can(s).has("recordAcceptance"), s).toBe(false);
  });
  it("customer and property details can be corrected while the agreement is open, never on an active one (that needs an addendum)", () => {
    for (const s of ["DRAFT", "PENDING_APPROVAL", "CHANGES_REQUESTED", "AWAITING_PAYMENT"]) expect(can(s).has("editDetails"), s).toBe(true);
    for (const s of ["ACTIVE", "CANCELLED", "REJECTED"]) expect(can(s, s === "ACTIVE" ? future : null).has("editDetails"), s).toBe(false);
  });
  it("an active agreement can be suspended and reactivated; a suspended one is not active and cannot be renewed, edited or paid", () => {
    expect(can("ACTIVE", future).has("suspend")).toBe(true); expect(can("ACTIVE", future).has("reactivate")).toBe(false);
    const s = can("SUSPENDED", future);
    expect(s.has("reactivate")).toBe(true); expect(s.has("cancel")).toBe(true);
    for (const a of ["suspend", "renew", "editDetails", "recordPayment", "revise", "addendum"] as const) expect(s.has(a), a).toBe(false);
    expect(displayStatus({ status: "SUSPENDED", expiryDate: future })).toBe("SUSPENDED");
    expect(can("PENDING_APPROVAL").has("suspend")).toBe(false); // only an agreement that is active can be put on hold
  });
  it("a price change is possible while the agreement is still open, never on an active one (that needs an addendum)", () => {
    for (const s of ["DRAFT", "PENDING_APPROVAL", "CHANGES_REQUESTED", "AWAITING_PAYMENT"]) expect(can(s).has("revise"), s).toBe(true);
    expect(can("ACTIVE", future).has("revise")).toBe(false);
    expect(can("ACTIVE", future).has("addendum")).toBe(true);
  });
  it("renewal is for active and expired agreements only; finished ones allow nothing but notes", () => {
    expect(can("ACTIVE", future).has("renew")).toBe(true);
    expect(can("ACTIVE", past).has("renew")).toBe(true);
    for (const s of ["CANCELLED", "REJECTED"]) expect([...can(s)]).toEqual(["note"]);
  });
  it("the payment link can be sent again only while payment is outstanding", () => {
    expect(can("AWAITING_PAYMENT").has("resendPaymentLink")).toBe(true);
    expect(can("ACTIVE", future).has("resendPaymentLink")).toBe(false);
    expect(can("PENDING_APPROVAL").has("resendPaymentLink")).toBe(false);
  });
});

describe("recording a payment", () => {
  it("needs a reference, or for an approved arrangement a written description", () => {
    expect(paymentProblem({ method: "Bank transfer", reference: "", note: "" })).toMatch(/reference/i);
    expect(paymentProblem({ method: "Bank transfer", reference: "TRX-1", note: "" })).toBeNull();
    expect(paymentProblem({ method: ALTERNATIVE_ARRANGEMENT, reference: "", note: "ok" })).toMatch(/arrangement/i);
    expect(paymentProblem({ method: ALTERNATIVE_ARRANGEMENT, reference: "", note: "Approved by the owner: pay in two instalments" })).toBeNull();
    expect(paymentProblem({ method: "Gold coins", reference: "x1", note: "" })).toMatch(/received/i);
  });
  it("the term runs for the stated months from activation", () => {
    expect(expiryFrom(new Date("2026-11-07T12:00:00Z"), 12).toISOString().slice(0, 10)).toBe("2027-11-07");
    expect(expiryFrom(new Date("2026-01-15T00:00:00Z"), 6).toISOString().slice(0, 10)).toBe("2026-07-15");
  });
});
