// Governs whether an employee may edit the Final Price of a Spare Part or
// Labour invoice line away from its catalog/default price (Employee.
// sparePartPriceModification / labourPriceModification). "Admin Approval
// Required" behaves identically to "Allowed" at save-time -- the distinction
// only matters for which rows the Price Modification Report (Spare Parts
// Chunk 8) flags for follow-up, per the confirmed plan decision.
export const PRICE_MODIFICATION_LEVELS = [
  "Not Allowed",
  "Allowed",
  "Allowed with Maximum Discount",
  "Admin Approval Required",
] as const;

export type PriceModificationLevel = (typeof PRICE_MODIFICATION_LEVELS)[number];

// Called server-side (never trust a client-side gate alone) wherever an
// invoice line's Final Price is set away from its catalog Original Price --
// wired into the Invoice wizard's server action in Spare Parts Chunk 7.
export function validatePriceModification(
  level: string,
  maxDiscountPercent: number | null,
  originalPrice: number,
  finalPrice: number
): { ok: boolean; error?: string } {
  if (level === "Not Allowed") {
    if (finalPrice !== originalPrice) {
      return { ok: false, error: "Price modification is not allowed for this item." };
    }
    return { ok: true };
  }
  if (level === "Allowed with Maximum Discount") {
    const pct = maxDiscountPercent ?? 0;
    const floor = originalPrice * (1 - pct / 100);
    if (finalPrice < floor) {
      return { ok: false, error: `Exceeds maximum discount of ${pct}%.` };
    }
    return { ok: true };
  }
  // "Allowed" and "Admin Approval Required" both permit any final price.
  return { ok: true };
}
