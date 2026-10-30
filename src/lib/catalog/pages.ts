import { prisma } from "@/lib/prisma";
import { createBlock, type Block } from "@/lib/cms/blocks";
import { RESERVED_SLUGS, SLUG_PATTERN } from "@/lib/cms/pageRules";

// "Create website pages" from the Service Catalogue: one DRAFT page per category (a hub that lists its services) and one DRAFT page
// per service underneath it in the page tree. Nothing is visible to visitors until a page is published; once published, the pages
// nest in the Services menu (category → services). Re-running only creates what is missing.

const bi = (en: string, ar: string) => ({ en, ar });
const empty = bi("", "");

type CatText = { nameEn: string; nameAr: string; shortDescriptionEn: string; shortDescriptionAr: string; descriptionEn: string; descriptionAr: string };
type SvcText = CatText & { seoTitleEn: string | null; seoTitleAr: string | null; seoDescriptionEn: string | null; seoDescriptionAr: string | null };

function hero(heading: ReturnType<typeof bi>, subtitle: ReturnType<typeof bi>): Block {
  const b = createBlock("hero");
  b.props = { ...b.props, align: "center", heading, subtitle };
  return b;
}
function text(heading: ReturnType<typeof bi>, body: ReturnType<typeof bi>): Block {
  const b = createBlock("richText");
  b.props = { heading, align: "start", body };
  return b;
}
function cta(heading: ReturnType<typeof bi>): Block {
  const b = createBlock("cta");
  b.props = { heading, subtitle: empty, button: { label: bi("Book a Service", "احجز خدمة"), url: "/pricing" } };
  return b;
}

export function categoryBlocks(c: CatText): Block[] {
  const blocks: Block[] = [
    hero(bi(c.nameEn, c.nameAr), bi(c.shortDescriptionEn || `All our ${c.nameEn} in one place, across the UAE.`, c.shortDescriptionAr || `كل ${c.nameAr} في مكان واحد في جميع أنحاء الإمارات.`)),
  ];
  if (c.descriptionEn.trim() || c.descriptionAr.trim()) blocks.push(text(empty, bi(c.descriptionEn, c.descriptionAr)));
  const list = createBlock("subPages");
  list.props = { ...list.props, heading: bi("Our services", "خدماتنا") };
  blocks.push(list, cta(bi("Need help? Book a service", "تحتاج مساعدة؟ احجز خدمة")));
  return blocks;
}

export function serviceBlocks(s: SvcText, category: CatText): Block[] {
  const en = s.descriptionEn || `${s.nameEn} is one of the ${category.nameEn} we provide across the UAE. Book online, tell us what you need, and our team will confirm the visit, the price and the timing with you.`;
  const ar = s.descriptionAr || `${s.nameAr} إحدى خدمات «${category.nameAr}» التي نقدمها في جميع أنحاء الإمارات. احجز عبر الإنترنت وأخبرنا بما تحتاجه، وسيؤكد فريقنا معك الزيارة والسعر والموعد.`;
  return [
    hero(bi(s.nameEn, s.nameAr), bi(s.shortDescriptionEn || `${s.nameEn} by OSTA Services technicians across the UAE.`, s.shortDescriptionAr || `${s.nameAr} من فنيي خدمات آسطا في جميع أنحاء الإمارات.`)),
    text(bi("About this service", "عن الخدمة"), bi(en, ar)),
    cta(bi(`Book ${s.nameEn}`, `احجز ${s.nameAr}`)),
  ];
}

export function pageSeo(s: { nameEn: string; nameAr: string; seoTitleEn?: string | null; seoTitleAr?: string | null; seoDescriptionEn?: string | null; seoDescriptionAr?: string | null }) {
  return {
    titleEn: s.seoTitleEn || `${s.nameEn} in the UAE`,
    titleAr: s.seoTitleAr || `${s.nameAr} في الإمارات`,
    descriptionEn: s.seoDescriptionEn || `Book ${s.nameEn} with OSTA Services across the UAE. Clear pricing and certified technicians.`,
    descriptionAr: s.seoDescriptionAr || `احجز ${s.nameAr} مع خدمات آسطا في جميع أنحاء الإمارات. أسعار واضحة وفنيون معتمدون.`,
    canonical: "", noindex: false, ogImage: "", focusKeyword: "", secondaryKeywords: "",
  };
}

// A page address (one segment) from a catalogue slug that no other page uses.
export function pageSlug(base: string, taken: Set<string>): string {
  let root = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/g, "") || "service";
  if (RESERVED_SLUGS.includes(root)) root = `${root}-services`;
  for (let n = 1; ; n++) {
    const slug = n === 1 ? root : `${root}-${n}`;
    if (!taken.has(slug) && SLUG_PATTERN.test(slug)) {
      taken.add(slug);
      return slug;
    }
  }
}

export type CreatePagesResult = { categoriesCreated: number; servicesCreated: number; alreadyHad: number; inServicesMenu: boolean };

const chunks = <T,>(list: T[], size: number): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

export async function createCatalogPages(): Promise<CreatePagesResult> {
  const [cats, services, existing, slugRows, redirects, servicesItem] = await Promise.all([
    prisma.catalogCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] }),
    prisma.catalogService.findMany({ include: { categories: { orderBy: { sortOrder: "asc" } } } }),
    prisma.cmsPage.findMany({ where: { OR: [{ catalogCategoryId: { not: null } }, { catalogServiceId: { not: null } }] }, select: { id: true, catalogCategoryId: true, catalogServiceId: true } }),
    prisma.cmsPage.findMany({ select: { slug: true } }),
    prisma.cmsRedirect.findMany({ select: { fromPath: true } }),
    // The categories go inside the header menu's "Services" entry when there is one.
    prisma.menuItem.findFirst({ where: { menu: "header", parentId: null, url: "/services" }, select: { id: true } }),
  ]);
  const taken = new Set([...slugRows.map((r) => r.slug), ...redirects.map((r) => r.fromPath.replace(/^\//, ""))]);
  const pageOfCategory = new Map(existing.filter((e) => e.catalogCategoryId).map((e) => [e.catalogCategoryId!, e.id]));
  const hadService = new Set(existing.filter((e) => e.catalogServiceId).map((e) => e.catalogServiceId!));
  const catOrder = new Map(cats.map((c, i) => [c.id, i]));
  let categoriesCreated = 0;

  for (const [i, c] of cats.entries()) {
    if (pageOfCategory.has(c.id)) continue;
    const created = await prisma.cmsPage.create({
      data: {
        slug: pageSlug(c.slug, taken), type: "service", status: "DRAFT", titleEn: c.nameEn, titleAr: c.nameAr, sortOrder: i,
        showInMenus: !!servicesItem, menuParent: servicesItem?.id ?? "", catalogCategoryId: c.id,
        draftBlocks: categoryBlocks(c) as never, draftSeo: pageSeo(c) as never,
      },
      select: { id: true },
    });
    pageOfCategory.set(c.id, created.id);
    categoriesCreated++;
  }

  const rows = [];
  for (const s of services) {
    if (hadService.has(s.id) || s.categories.length === 0) continue;
    // The page lives under the first category (in catalogue order) the service belongs to.
    const link = [...s.categories].sort((a, b) => (catOrder.get(a.categoryId) ?? 0) - (catOrder.get(b.categoryId) ?? 0))[0];
    const category = cats.find((c) => c.id === link.categoryId)!;
    rows.push({
      slug: pageSlug(s.slug, taken), type: "service", status: "DRAFT", titleEn: s.nameEn, titleAr: s.nameAr, parentId: pageOfCategory.get(link.categoryId)!, sortOrder: link.sortOrder,
      showInMenus: true, menuParent: "parent", catalogServiceId: s.id, draftBlocks: serviceBlocks(s, category) as never, draftSeo: pageSeo(s) as never,
      _order: (catOrder.get(link.categoryId) ?? 0) * 100000 + link.sortOrder,
    });
  }
  rows.sort((a, b) => a._order - b._order);
  for (const part of chunks(rows, 150)) await prisma.cmsPage.createMany({ data: part.map(({ _order, ...r }) => (void _order, r)) });
  return { categoriesCreated, servicesCreated: rows.length, alreadyHad: existing.length, inServicesMenu: !!servicesItem };
}
