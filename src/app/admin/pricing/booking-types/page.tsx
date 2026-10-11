import { prisma } from "@/lib/prisma";
import { filsToAed } from "@/lib/pricing/money";
import { BookingTypesEditor } from "@/components/pricing/BookingTypesEditor";

export default async function BookingTypesPage() {
  const [types, services, regions] = await Promise.all([
    prisma.bookingType.findMany({
      orderBy: { sortOrder: "asc" },
      include: { overrides: { include: { service: true, region: true } } },
    }),
    prisma.bookableService.findMany({ select: { id: true, nameEn: true }, orderBy: { sortOrder: "asc" } }),
    prisma.region.findMany({ select: { id: true, nameEn: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">Booking types</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        Booking fees are added after the discount and are never discounted. Slots stay &quot;requested&quot; until the team confirms availability.
      </p>
      <BookingTypesEditor
        services={services.map((s) => ({ id: s.id, name: s.nameEn }))}
        regions={regions.map((r) => ({ id: r.id, name: r.nameEn }))}
        rows={types.map((t) => ({
          id: t.id,
          code: t.code,
          nameEn: t.nameEn,
          nameAr: t.nameAr,
          descriptionEn: t.descriptionEn ?? "",
          descriptionAr: t.descriptionAr ?? "",
          feeAed: filsToAed(t.defaultFeeFils),
          hoursStart: t.hoursStart ?? "",
          hoursEnd: t.hoursEnd ?? "",
          sameDayAllowed: t.sameDayAllowed,
          active: t.active,
          overrides: t.overrides.map((o) => ({
            id: o.id,
            serviceName: o.service?.nameEn ?? "Any service",
            regionName: o.region?.nameEn ?? "Any emirate",
            feeAed: filsToAed(o.feeFils),
          })),
        }))}
      />
    </div>
  );
}
