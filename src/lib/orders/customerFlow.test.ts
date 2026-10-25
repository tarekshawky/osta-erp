import { describe, expect, it } from "vitest";
import { customerFlow, reviewProblem } from "./customerFlow";

const inv = (status: string) => ({ number: "INV-1", amount: 670, status, paymentLink: "https://pay.example/x" });
const review = { rating: 5, comment: "Great", createdAt: new Date("2026-10-01T10:00:00Z") };

describe("customerFlow", () => {
  it("asks for a rating first when the job is done", () => {
    const f = customerFlow({ status: "Done", review: null, invoice: inv("Unpaid") });
    expect(f.canReview).toBe(true);
    expect(f.payment).toEqual({ amount: 670, link: null, locked: true }); // no payment link before the rating
    expect(f.invoice).toBeNull(); // no invoice before payment
  });
  it("unlocks payment after the rating, still no invoice", () => {
    const f = customerFlow({ status: "Done", review, invoice: inv("Unpaid") });
    expect(f.canReview).toBe(false);
    expect(f.payment).toEqual({ amount: 670, link: "https://pay.example/x", locked: false });
    expect(f.invoice).toBeNull();
  });
  it("shows the invoice only once it is paid", () => {
    const f = customerFlow({ status: "Done", review, invoice: inv("Paid") });
    expect(f.payment).toBeNull();
    expect(f.invoice).toEqual({ number: "INV-1", amount: 670, status: "Paid" });
  });
  it("does not ask to rate a job that is not done", () => {
    expect(customerFlow({ status: "In Progress", review: null, invoice: null }).canReview).toBe(false);
    expect(customerFlow({ status: "Assigned", review: null, invoice: inv("Unpaid") }).payment?.locked).toBe(true);
  });
  it("waits quietly when the job is done and there is no invoice yet", () => {
    const f = customerFlow({ status: "Done", review, invoice: null });
    expect(f.payment).toBeNull();
    expect(f.invoice).toBeNull();
  });
});

describe("reviewProblem", () => {
  it("accepts 1-5 whole stars and an optional short comment", () => {
    expect(reviewProblem(5, "Nice")).toBeNull();
    expect(reviewProblem(1, undefined)).toBeNull();
  });
  it("rejects anything else", () => {
    expect(reviewProblem(0, "")).toMatch(/1 to 5/);
    expect(reviewProblem(6, "")).toMatch(/1 to 5/);
    expect(reviewProblem(4.5, "")).toMatch(/1 to 5/);
    expect(reviewProblem("5", "")).toMatch(/1 to 5/);
    expect(reviewProblem(5, "x".repeat(1001))).toMatch(/1000/);
  });
});
