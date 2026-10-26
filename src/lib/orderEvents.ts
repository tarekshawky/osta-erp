// Lives here, not in src/app/admin/orders/pricing-actions.ts: that file is a
// "use server" module, where every export must be an async function. A const
// exported from it reaches client components as a server-action reference
// (not an array), which crashed every admin order page with
// "ORDER_EVENT_TYPES.filter is not a function".
export const ORDER_EVENT_TYPES = [
  "CONFIRMED",
  "DISPATCHED",
  "ARRIVED",
  "COMPLETED",
  "NO_ANSWER",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_COMPANY",
  "TEAM_NO_SHOW",
] as const;
