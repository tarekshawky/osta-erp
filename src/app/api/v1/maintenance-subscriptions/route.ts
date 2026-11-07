import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, isLimited, recordAttempt } from "@/lib/authLimits";
import { notifyAdminOfMaintenanceSubscription } from "@/lib/emailSender";
import { SubscriptionInput, activationDateProblem } from "@/lib/maintenance/packages";
import { apiSuccess, apiError, parseJsonBody, corsPreflight } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// A visitor's "Subscribe now" form. It becomes a request in the admin (Website → Maintenance Packages → Requests); nobody is
// charged or signed up automatically. The package's name and price are copied into the request as they are right now.
export async function POST(request: NextRequest) {
  const raw = await parseJsonBody<unknown>(request);
  const parsed = SubscriptionInput.safeParse(raw);
  if (!parsed.success) return apiError("invalid_request", "Please check the form: some details are missing or not valid.", 400);
  const input = parsed.data;
  const dateProblem = activationDateProblem(input.activationDate);
  if (dateProblem) return apiError("invalid_request", dateProblem, 400);

  const ip = clientIp(request.headers);
  if (await isLimited(prisma, "subscribe", ip, input.email)) return apiError("rate_limited", "Too many requests. Please try again later or contact us on WhatsApp.", 429);

  const pkg = await prisma.maintenancePackage.findFirst({ where: { id: input.packageId, active: true } }).catch(() => null);
  if (!pkg) return apiError("not_found", "This package is not available. Please choose another one.", 404);

  await recordAttempt(prisma, "subscribe", ip, input.email);
  const row = await prisma.maintenanceSubscription.create({
    data: {
      packageId: pkg.id, packageName: pkg.nameEn, packagePrice: pkg.price, name: input.name, phone: input.phone, email: input.email, emirate: input.emirate,
      location: input.location, propertyType: input.propertyType, bedrooms: input.bedrooms, acUnits: input.acUnits,
      activationDate: input.activationDate ? new Date(`${input.activationDate}T00:00:00+04:00`) : null,
    },
  });
  // A mail provider problem must never lose the request: it is already saved.
  try {
    await notifyAdminOfMaintenanceSubscription({ packageName: pkg.nameEn, price: pkg.price, name: input.name, phone: input.phone, email: input.email, emirate: input.emirate, location: input.location, propertyType: input.propertyType, bedrooms: input.bedrooms, acUnits: input.acUnits, activationDate: input.activationDate });
  } catch (err) {
    console.error("[maintenance-subscription] admin notification failed:", err instanceof Error ? err.message : "unknown");
  }
  return apiSuccess({ received: true, id: row.id }, { status: 201 });
}
