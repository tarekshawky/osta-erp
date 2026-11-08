import { createFromLibrary, LIBRARY } from "./blockLibrary";
import type { Block } from "./blocks";

// The ductwork page already exists at /duct-insulation with its own content and design. Only the calculator block is added to it (to the
// draft, at the end) from Self-Service Quotations → Ductwork pricing; the administrator moves it where it fits and publishes the page.

export const DUCT_SLUG = "duct-insulation";

export function withDuctCalculator(draft: unknown): { ok: true; blocks: Block[]; added: boolean } | { ok: false; error: string } {
  if (draft != null && !Array.isArray(draft)) return { ok: false, error: "The page draft could not be read." };
  const blocks = (draft ?? []) as Block[];
  if (blocks.some((b) => b?.type === "ductQuoteCalculator")) return { ok: true, blocks, added: false };
  const entry = LIBRARY.find((e) => e.id === "duct-quote-calculator");
  if (!entry) return { ok: false, error: "The calculator block is not available." };
  return { ok: true, blocks: [...blocks, createFromLibrary(entry)], added: true };
}
