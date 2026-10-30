import { NextResponse } from "next/server";
import { peekPermission } from "@/lib/adminGuard";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/forms/forms";
import { CSV_COLUMNS } from "@/lib/catalog/rules";

export const dynamic = "force-dynamic";

// Every service, one row each, in the same columns the import reads. A service in several categories lists them with "|"
// (the first is the main one), so an exported file can be edited and imported back.
export async function GET() {
  const auth = await peekPermission("pages.edit");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === "unauthorized" ? 401 : 403 });
  const cats = await prisma.catalogCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, slug: true } });
  const slugOf = new Map(cats.map((c) => [c.id, c.slug]));
  const order = new Map(cats.map((c, i) => [c.id, i]));
  const services = await prisma.catalogService.findMany({ include: { categories: { orderBy: { sortOrder: "asc" } } } });
  services.sort((a, b) => (order.get(a.categories[0]?.categoryId ?? "") ?? 999) - (order.get(b.categories[0]?.categoryId ?? "") ?? 999) || (a.categories[0]?.sortOrder ?? 0) - (b.categories[0]?.sortOrder ?? 0));
  const csv = toCsv([
    [...CSV_COLUMNS],
    ...services.map((s) => [
      s.categories.map((c) => slugOf.get(c.categoryId) ?? "").filter(Boolean).join("|"), s.slug, s.nameEn, s.nameAr, s.groupEn ?? "", s.groupAr ?? "",
      s.shortDescriptionEn, s.shortDescriptionAr, s.descriptionEn, s.descriptionAr, s.active ? "yes" : "no",
      s.seoTitleEn ?? "", s.seoTitleAr ?? "", s.seoDescriptionEn ?? "", s.seoDescriptionAr ?? "", s.seoKeywordsEn ?? "", s.seoKeywordsAr ?? "", s.canonicalUrl ?? "", s.iconName ?? "", s.imageUrl ?? "",
    ]),
  ]);
  return new NextResponse(`﻿${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="service-catalogue-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
