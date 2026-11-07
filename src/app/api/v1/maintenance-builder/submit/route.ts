import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, isLimited, recordAttempt } from "@/lib/authLimits";
import { notifyAdminOfMaintenanceSubscription } from "@/lib/emailSender";
import { loadEngineData } from "@/lib/maintenance/data";
import { evaluateBuilder } from "@/lib/maintenance/builder";
import { SubmitInput, toNeeds } from "@/lib/maintenance/builderInput";
import { activationDateProblem } from "@/lib/maintenance/packages";
import { apiSuccess, apiError, parseJsonBody, corsPreflight } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// "Confirm Subscription" / "Request a Custom Quotation" from the Smart Package Builder. The server works the whole thing out again
// (recommendation and price) from the admin's own data and stores THAT, never numbers sent by the browser.
export async function POST(request: NextRequest) {
  const parsed = SubmitInput.safeParse(await parseJsonBody<unknown>(request));
  if (!parsed.success) return apiError("invalid_request", "Please check the form: some details are missing or not valid.", 400);
  const input = parsed.data;
  const dateProblem = activationDateProblem(input.activationDate);
  if (dateProblem) return apiError("invalid_request", dateProblem, 400);

  const data = await loadEngineData(input.group).catch(() => null);
  if (!data || !data.config.enabled) return apiError("not_found", "The package builder is not available for this page.", 404);
  const { packages, services } = data.pub;
  const selected = packages.find((p) => p.id === input.selectedId);
  const chosen = packages.find((p) => p.id === (input.chosenId ?? input.selectedId));
  if (!selected || !chosen) return apiError("not_found", "This package is not available. Please choose another one.", 404);

  // Required fields are whatever the admin set (the property type must be one of the admin's types).
  const f = data.config.fields;
  const missing =
    (f.whatsapp === "required" && !input.customer.whatsapp) || (f.area === "required" && !input.customer.area) || (f.address === "required" && !input.customer.address) ||
    (f.bedrooms === "required" && !input.property.bedrooms) || (f.bathrooms === "required" && !input.property.bathrooms) || (f.floors === "required" && !input.property.floors) ||
    (f.size === "required" && !input.property.size) || (f.acUnits === "required" && !input.needs.acUnits);
  if (missing) return apiError("invalid_request", "Please fill in the required details.", 400);
  const type = data.config.propertyTypes.find((t) => t.key === input.property.type);
  if (!type) return apiError("invalid_request", "Choose a property type.", 400);

  const ip = clientIp(request.headers);
  if (await isLimited(prisma, "subscribe", ip, input.customer.email)) return apiError("rate_limited", "Too many requests. Please try again later or contact us on WhatsApp.", 429);

  const needs = toNeeds(input.needs);
  const ev = evaluateBuilder({ packages, services, options: data.options, config: data.config, tax: data.tax, selectedId: selected.id, chosenId: chosen.id, needs });
  const b = ev.breakdown;
  const recommended = packages.find((p) => p.id === ev.recommendedId);
  const quote = input.wantsQuote || b.quote;
  const suggestedPackage = ev.selectedFits ? "" : recommended?.nameEn ?? (ev.exceedsAll ? "Custom quotation" : "");
  // The customer carried on with a package the system said does not cover everything: the admin should look at it first.
  const status = !ev.selectedFits && chosen.id === selected.id ? "Upgrade Suggested" : "New Request";
  const picked = data.options.filter((o) => needs.optionIds.includes(o.id));

  await recordAttempt(prisma, "subscribe", ip, input.customer.email);
  const row = await prisma.maintenanceSubscription.create({
    data: {
      packageId: chosen.id, packageName: chosen.nameEn, packagePrice: chosen.price, groupKey: input.group, kind: "builder", status,
      name: input.customer.name, phone: input.customer.phone, whatsapp: input.customer.whatsapp, email: input.customer.email, emirate: input.customer.emirate, area: input.customer.area,
      address: input.customer.address, location: [input.customer.area, input.customer.address].filter(Boolean).join(", "), propertyType: type.en, propertySize: input.property.size || null,
      bedrooms: input.property.bedrooms, bathrooms: input.property.bathrooms, floors: input.property.floors, acUnits: input.needs.acUnits,
      activationDate: input.activationDate ? new Date(`${input.activationDate}T00:00:00+04:00`) : null, message: input.notes,
      suggestedPackage, subtotal: b.subtotal, vatAmount: b.vat, total: b.total, quoteRequested: quote,
      details: {
        selectedPackage: selected.nameEn, chosenPackage: chosen.nameEn, recommendedPackage: recommended?.nameEn ?? null, selectedFits: ev.selectedFits, exceedsAll: ev.exceedsAll,
        notices: ev.notices.map((n) => n.en), services: picked.map((o) => o.nameEn), handymanHours: input.needs.handymanHours, extras: input.needs.extras, otherText: input.needs.otherText,
        lines: b.lines.map((l) => ({ label: l.labelEn, qty: l.qty, unitPrice: l.unitPrice, amount: l.amount, note: l.note })), quoteReasons: b.quoteReasons, vatPercent: b.vatPercent, pricesIncludeVat: b.pricesIncludeVat, wantsQuote: input.wantsQuote,
      } as never,
    },
  });
  try {
    await notifyAdminOfMaintenanceSubscription({
      packageName: chosen.nameEn, price: chosen.price, kind: quote ? "quote" : "subscribe", message: [input.notes, suggestedPackage ? `System suggested: ${suggestedPackage}` : "", `Estimated total: ${quote ? "quotation requested" : `AED ${b.total.toLocaleString("en-US")}`}`].filter(Boolean).join(" | "),
      name: input.customer.name, phone: input.customer.phone, email: input.customer.email, emirate: input.customer.emirate, location: [input.customer.area, input.customer.address].filter(Boolean).join(", "),
      propertyType: type.en, bedrooms: input.property.bedrooms, acUnits: input.needs.acUnits, activationDate: input.activationDate,
    });
  } catch (err) {
    console.error("[maintenance-builder] admin notification failed:", err instanceof Error ? err.message : "unknown");
  }
  return apiSuccess({ received: true, id: row.id, quoteRequested: quote }, { status: 201 });
}
