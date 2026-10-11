"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { createBlock, type Block } from "@/lib/cms/blocks";
import { SLUG_PATTERN, slugProblem } from "@/lib/cms/pageRules";
import type { Prisma } from "@/generated/prisma";

export type ActionResult = { ok: boolean; error?: string; id?: string };
const fail = (error: string): ActionResult => ({ ok: false, error });
const done = (id?: string): ActionResult => {
  revalidatePath("/admin/website/areas");
  return { ok: true, id };
};

export type AreaInput = {
  regionId: string; slug: string; nameEn: string; nameAr: string; kind: "emirate" | "area";
  latitude: string; longitude: string; mapsUrl: string; active: boolean; serviceIds: string[];
};

function parse(input: AreaInput) {
  if (!input.nameEn.trim() || !input.nameAr.trim()) return { error: "Both the English and Arabic names are required." };
  if (!SLUG_PATTERN.test(input.slug)) return { error: "Slug can only contain lowercase letters, numbers and single hyphens." };
  if (!["emirate", "area"].includes(input.kind)) return { error: "Unknown kind." };
  const num = (v: string, min: number, max: number, label: string) => {
    if (v.trim() === "") return { value: null as number | null };
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? { value: n } : { error: `${label} must be a number between ${min} and ${max}.` };
  };
  const lat = num(input.latitude, -90, 90, "Latitude");
  const lng = num(input.longitude, -180, 180, "Longitude");
  if ("error" in lat) return { error: lat.error };
  if ("error" in lng) return { error: lng.error };
  if ((lat.value === null) !== (lng.value === null)) return { error: "Enter both latitude and longitude, or neither." };
  if (input.mapsUrl.trim() && !/^https:\/\//.test(input.mapsUrl.trim())) return { error: "Maps link must start with https://" };
  return { lat: lat.value, lng: lng.value };
}

export async function saveArea(id: string | null, input: AreaInput): Promise<ActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const parsed = parse(input);
  if ("error" in parsed) return fail(parsed.error as string);
  if (!(await prisma.region.findUnique({ where: { id: input.regionId } }))) return fail("Choose the emirate this area belongs to.");
  const clash = await prisma.serviceArea.findUnique({ where: { slug: input.slug } });
  if (clash && clash.id !== id) return fail("An area with this slug already exists.");

  const data = {
    regionId: input.regionId, slug: input.slug, nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim(), kind: input.kind,
    latitude: parsed.lat, longitude: parsed.lng, mapsUrl: input.mapsUrl.trim(), active: input.active,
  };
  const serviceRefs = input.serviceIds.map((sid) => ({ id: sid }));
  const before = id ? await prisma.serviceArea.findUnique({ where: { id }, select: { slug: true, nameEn: true, active: true } }) : null;
  const saved = id
    ? await prisma.serviceArea.update({ where: { id }, data: { ...data, services: { set: serviceRefs } } })
    : await prisma.serviceArea.create({ data: { ...data, services: { connect: serviceRefs } } });
  await writeAudit(g.admin, id ? "area.update" : "area.create", "ServiceArea", saved.id, before, { slug: data.slug, nameEn: data.nameEn, active: data.active, services: input.serviceIds.length });
  return done(saved.id);
}

export async function deleteArea(id: string): Promise<ActionResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return fail(g.error);
  if ((await prisma.cmsPage.count({ where: { areaId: id, deletedAt: null } })) > 0) return fail("This area has a page. Delete or unlink the page first.");
  const a = await prisma.serviceArea.findUnique({ where: { id } });
  if (!a) return fail("Area not found.");
  await prisma.serviceArea.delete({ where: { id } });
  await writeAudit(g.admin, "area.delete", "ServiceArea", id, { slug: a.slug, nameEn: a.nameEn }, null);
  return done();
}

// Starter content for an area page. It names the area and leaves the real local detail to the editor; because the
// text is otherwise identical across areas, the duplicate guard will refuse to publish an unedited starter.
function starterBlocks(nameEn: string, nameAr: string): Block[] {
  const hero = createBlock("hero");
  hero.props = {
    ...hero.props, align: "center",
    eyebrow: { en: nameEn, ar: nameAr },
    heading: { en: `AC repair and home maintenance in ${nameEn}`, ar: `صيانة المكيفات والمنازل في ${nameAr}` },
    subtitle: { en: `OSTA Services sends certified technicians to homes and businesses in ${nameEn}, with transparent pricing and a warranty on every job.`, ar: `ترسل خدمات أسطا فنيين معتمدين إلى المنازل والشركات في ${nameAr} بأسعار شفافة وضمان على كل عمل.` },
    ctas: [{ label: { en: "Book a service", ar: "احجز خدمة" }, url: "/orders/new" }],
  };
  const text = createBlock("richText");
  text.props = { ...text.props, heading: { en: `Serving ${nameEn}`, ar: `خدماتنا في ${nameAr}` }, body: { en: "Describe how you work in this area: neighbourhoods you cover, typical problems, response times and anything customers here should know.", ar: "صف كيف تعمل في هذه المنطقة: الأحياء التي تغطيها والمشاكل الشائعة وأوقات الاستجابة وأي معلومة تهم العملاء هنا." }, align: "start" };
  const grid = createBlock("servicesGrid");
  grid.props = { ...grid.props, heading: { en: `Our services in ${nameEn}`, ar: `خدماتنا في ${nameAr}` }, limit: 8 };
  const faq = createBlock("faq");
  faq.props = { heading: { en: `Questions about service in ${nameEn}`, ar: `أسئلة عن الخدمة في ${nameAr}` }, items: [] };
  const cta = createBlock("cta");
  cta.props = { ...cta.props, heading: { en: `Need help in ${nameEn}?`, ar: `تحتاج مساعدة في ${nameAr}؟` }, subtitle: { en: "Book online or message us on WhatsApp.", ar: "احجز عبر الموقع أو راسلنا على واتساب." }, button: { label: { en: "Book now", ar: "احجز الآن" }, url: "/orders/new" } };
  return [hero, text, grid, faq, cta];
}

export async function createAreaPage(areaId: string): Promise<ActionResult> {
  const g = await guardPermission("pages.create");
  if (!g.ok) return fail(g.error);
  const area = await prisma.serviceArea.findUnique({ where: { id: areaId } });
  if (!area) return fail("Area not found.");
  if (await prisma.cmsPage.findFirst({ where: { areaId, deletedAt: null } })) return fail("This area already has a page.");

  let slug = `services-in-${area.slug}`;
  for (let n = 2; await prisma.cmsPage.findUnique({ where: { slug } }); n++) slug = `services-in-${area.slug}-${n}`;
  const problem = slugProblem(slug);
  if (problem) return fail(problem);

  const page = await prisma.cmsPage.create({
    data: {
      slug, type: "area", areaId, titleEn: `Home services in ${area.nameEn}`, titleAr: `خدمات منزلية في ${area.nameAr}`, showLastUpdated: true,
      draftBlocks: starterBlocks(area.nameEn, area.nameAr) as unknown as Prisma.InputJsonValue,
      draftSeo: { titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "", canonical: "", noindex: false, ogImage: "", focusKeyword: `ac repair ${area.nameEn.toLowerCase()}`, secondaryKeywords: "" },
      createdById: g.admin.id, updatedById: g.admin.id,
    },
  });
  await writeAudit(g.admin, "area.page.create", "CmsPage", page.id, null, { area: area.slug, slug });
  return done(page.id);
}
