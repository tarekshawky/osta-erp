// Visit-fee eligibility. Pure so the rules can be unit-tested; the server action enforces it.
export const COMPANY_FAULT_EVENTS = ["CANCELLED_BY_COMPANY", "TEAM_NO_SHOW"];

export function visitFeeEligibility(input: {
  hasAcceptedPolicy: boolean;
  eventTypes: string[];
  policyReasons: string[];
  reason: string;
  chargeStatuses: string[];
}): string | null {
  if (!input.hasAcceptedPolicy) return "This order has no accepted visit-fee policy, so a visit fee cannot be charged.";
  if (!input.eventTypes.includes("DISPATCHED")) return "A visit fee can only be raised after the team has been dispatched.";
  if (input.eventTypes.some((t) => COMPANY_FAULT_EVENTS.includes(t))) {
    return "The company cancelled or the team did not show up, so no visit fee applies.";
  }
  if (!input.policyReasons.includes(input.reason)) return "This reason is not covered by the policy the customer accepted.";
  if (input.chargeStatuses.some((s) => s !== "REJECTED")) return "A visit fee has already been raised for this order.";
  return null;
}
