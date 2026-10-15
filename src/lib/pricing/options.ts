import { QuoteError } from "./priceQuote";

export type OptionInRegion = { id: string; priceFils: number | null };

// Which unit price applies. A service without options uses its own price. A service with options needs one of them
// chosen, and the option's price in the emirate becomes the unit price. Pure, so the rule is unit-tested; the server
// uses it for every order and the booking pages mirror it for the live preview.
export function chooseUnitPrice(o: { basePriceFils: number | null; options: OptionInRegion[]; optionId?: string | null }): { unitPriceFils: number | null; optionId: string | null } {
  if (o.options.length === 0) {
    if (o.optionId) throw new QuoteError("invalid_input", "This service has no options.");
    return { unitPriceFils: o.basePriceFils, optionId: null };
  }
  if (!o.optionId) throw new QuoteError("invalid_input", "Choose an option for this service.");
  const opt = o.options.find((x) => x.id === o.optionId);
  if (!opt) throw new QuoteError("invalid_input", "That option is not available for this service.");
  if (opt.priceFils === null) throw new QuoteError("service_unavailable", "This option is not available in the selected emirate.");
  return { unitPriceFils: opt.priceFils, optionId: opt.id };
}
