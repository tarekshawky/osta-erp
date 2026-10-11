// Pure, dependency-free pricing engine. All money is integer fils (1 AED = 100 fils).
// The booking app may copy this file verbatim for a live preview; only the admin API's
// server-side run is authoritative.

export type DiscountTier = {
  minQty: number;
  maxQty: number | null; // null = open-ended
  percent: number; // e.g. 13 or 12.5
  startsAt?: Date | null;
  endsAt?: Date | null;
};

export type QuoteAddOn = { id?: string; name?: string; priceFils: number; qty?: number };

export type PriceQuoteInput = {
  unitPriceFils: number | null; // null => service unavailable in the region
  quantity: number;
  minQuantity?: number;
  tiers: DiscountTier[]; // tiers of the rule set attached to the service ([] = no discount)
  bookingFeeFils: number;
  addOns?: QuoteAddOn[];
  vat: { ratePercent: number; pricesIncludeVat: boolean };
  at?: Date;
};

export type Quote = {
  unitPriceFils: number;
  quantity: number;
  subtotalFils: number;
  discountPercent: number;
  discountFils: number;
  serviceNetFils: number;
  bookingFeeFils: number;
  addOnsFils: number;
  vatFils: number;
  pricesIncludeVat: boolean;
  vatRatePercent: number;
  totalFils: number;
};

export class QuoteError extends Error {
  constructor(
    public code: "service_unavailable" | "invalid_quantity" | "invalid_input",
    message: string
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

function assertFils(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new QuoteError("invalid_input", `${label} must be a non-negative integer number of fils.`);
  }
}

// Half-up rounding of (amount * percent / 100) using basis points, never floats on money.
function percentOf(amountFils: number, percent: number): number {
  const bp = Math.round(percent * 100);
  return Math.floor((amountFils * bp + 5000) / 10000);
}

function tierActive(tier: DiscountTier, at: Date): boolean {
  if (tier.startsAt && at < tier.startsAt) return false;
  if (tier.endsAt && at > tier.endsAt) return false;
  return true;
}

// One tier only, matched on TOTAL quantity -- never stacked, never per unit.
export function matchTier(tiers: DiscountTier[], quantity: number, at: Date): DiscountTier | null {
  return (
    tiers.find(
      (t) => tierActive(t, at) && quantity >= t.minQty && (t.maxQty === null || quantity <= t.maxQty)
    ) ?? null
  );
}

export function priceQuote(input: PriceQuoteInput): Quote {
  const at = input.at ?? new Date();
  if (input.unitPriceFils === null) {
    throw new QuoteError("service_unavailable", "This service is not available in the selected emirate.");
  }
  assertFils(input.unitPriceFils, "unitPriceFils");
  assertFils(input.bookingFeeFils, "bookingFeeFils");
  if (!Number.isInteger(input.quantity) || input.quantity < Math.max(1, input.minQuantity ?? 1)) {
    throw new QuoteError("invalid_quantity", "Quantity is below the minimum for this service.");
  }

  const subtotalFils = input.unitPriceFils * input.quantity;
  const tier = matchTier(input.tiers, input.quantity, at);
  const discountPercent = tier?.percent ?? 0;
  const discountFils = percentOf(subtotalFils, discountPercent);
  const serviceNetFils = subtotalFils - discountFils;

  let addOnsFils = 0;
  for (const addOn of input.addOns ?? []) {
    assertFils(addOn.priceFils, "add-on price");
    addOnsFils += addOn.priceFils * (addOn.qty ?? 1);
  }

  const taxableFils = serviceNetFils + input.bookingFeeFils + addOnsFils;
  const { ratePercent, pricesIncludeVat } = input.vat;
  const rateBp = Math.round(ratePercent * 100);
  let vatFils: number;
  let totalFils: number;
  if (pricesIncludeVat) {
    // Extract for display only -- the total never grows.
    vatFils = Math.floor((taxableFils * rateBp + (10000 + rateBp) / 2) / (10000 + rateBp));
    totalFils = taxableFils;
  } else {
    vatFils = percentOf(taxableFils, ratePercent);
    totalFils = taxableFils + vatFils;
  }

  return {
    unitPriceFils: input.unitPriceFils,
    quantity: input.quantity,
    subtotalFils,
    discountPercent,
    discountFils,
    serviceNetFils,
    bookingFeeFils: input.bookingFeeFils,
    addOnsFils,
    vatFils,
    pricesIncludeVat,
    vatRatePercent: ratePercent,
    totalFils,
  };
}

// Admin-side validation: tiers sharing a date window must not overlap or leave gaps.
export function validateTiers(tiers: DiscountTier[]): string[] {
  const errors: string[] = [];
  const groups = new Map<string, DiscountTier[]>();
  for (const t of tiers) {
    if (!Number.isInteger(t.minQty) || t.minQty < 1) errors.push(`Tier minQty must be an integer >= 1 (got ${t.minQty}).`);
    if (t.maxQty !== null && t.maxQty < t.minQty) errors.push(`Tier ${t.minQty}-${t.maxQty} has max below min.`);
    if (t.percent < 0 || t.percent > 100) errors.push(`Tier ${t.minQty} percent must be 0-100.`);
    const key = `${t.startsAt?.toISOString() ?? ""}|${t.endsAt?.toISOString() ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.minQty - b.minQty);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      if (prev.maxQty === null || cur.minQty <= prev.maxQty) {
        errors.push(`Tiers overlap: ${prev.minQty}-${prev.maxQty ?? "∞"} and ${cur.minQty}-${cur.maxQty ?? "∞"}.`);
      } else if (cur.minQty > prev.maxQty + 1) {
        errors.push(`Gap between tiers: ${prev.maxQty + 1}-${cur.minQty - 1} has no tier.`);
      }
    }
  }
  return errors;
}

export function formatAedFromFils(fils: number): string {
  return `${(fils / 100).toFixed(2)} AED`;
}
