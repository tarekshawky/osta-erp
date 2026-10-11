import { describe, it, expect } from "vitest";
import { visitFeeEligibility } from "./visitFee";

const ok = {
  hasAcceptedPolicy: true,
  eventTypes: ["CREATED", "DISPATCHED"],
  policyReasons: ["CUSTOMER_REFUSED", "UNREACHABLE"],
  reason: "UNREACHABLE",
  chargeStatuses: [] as string[],
};

describe("visitFeeEligibility", () => {
  it("allows a fee after dispatch for a covered reason", () => {
    expect(visitFeeEligibility(ok)).toBeNull();
  });
  it("blocks before dispatch (never at creation)", () => {
    expect(visitFeeEligibility({ ...ok, eventTypes: ["CREATED"] })).toMatch(/after the team/);
  });
  it("blocks when the company cancelled or the team did not show", () => {
    expect(visitFeeEligibility({ ...ok, eventTypes: ["DISPATCHED", "CANCELLED_BY_COMPANY"] })).toMatch(/company/);
    expect(visitFeeEligibility({ ...ok, eventTypes: ["DISPATCHED", "TEAM_NO_SHOW"] })).toMatch(/company/);
  });
  it("blocks reasons the policy does not list", () => {
    expect(visitFeeEligibility({ ...ok, reason: "OTHER" })).toMatch(/not covered/);
  });
  it("blocks orders without an accepted policy", () => {
    expect(visitFeeEligibility({ ...ok, hasAcceptedPolicy: false })).toMatch(/no accepted/);
  });
  it("blocks a second charge unless the first was rejected", () => {
    expect(visitFeeEligibility({ ...ok, chargeStatuses: ["PENDING_REVIEW"] })).toMatch(/already/);
    expect(visitFeeEligibility({ ...ok, chargeStatuses: ["APPROVED"] })).toMatch(/already/);
    expect(visitFeeEligibility({ ...ok, chargeStatuses: ["REJECTED"] })).toBeNull();
  });
});
