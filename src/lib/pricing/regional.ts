// Emirate price levels. A service has ONE base starting price (the Ajman level); every emirate has a price factor (1.00, 1.10,
// 1.20 …). The price of a service in an emirate is the base times the factor, in whole dirhams (halves round up). A price typed by
// hand for one emirate always wins over this (see ServicePrice.auto).

export const DEFAULT_FACTORS: Record<string, number> = {
  ajman: 1, "umm-al-quwain": 1, "al-ain": 1,
  sharjah: 1.1, "ras-al-khaimah": 1.1, fujairah: 1.1,
  dubai: 1.2, "abu-dhabi": 1.2,
};

// baseFils: integer fils (1 AED = 100). Result: integer fils, a whole number of dirhams.
export function regionalPriceFils(baseFils: number, factor: number): number {
  if (!Number.isFinite(baseFils) || baseFils < 0) throw new Error("base price must be a non-negative number of fils");
  if (!Number.isFinite(factor) || factor <= 0) throw new Error("price factor must be greater than zero");
  // work in whole dirhams with basis points of the factor, so 0.1 + 0.2 style float errors can't tip a rounding
  const aedTimesBp = Math.round(baseFils / 100) * Math.round(factor * 10000);
  return Math.floor((aedTimesBp + 5000) / 10000) * 100;
}

export const factorProblem = (f: number): string | null => (!Number.isFinite(f) || f < 0.5 || f > 3 ? "A price factor must be between 0.50 and 3.00." : null);
