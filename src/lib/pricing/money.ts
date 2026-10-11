// Admin input/display helpers. Money is stored as integer fils; AED strings only exist at the edges.
export function aedToFils(input: string): number | null {
  const v = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  const [whole, frac = ""] = v.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function filsToAed(fils: number): string {
  const whole = Math.floor(fils / 100);
  const frac = fils % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
}
