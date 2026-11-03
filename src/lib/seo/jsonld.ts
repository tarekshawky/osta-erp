import type { Block } from "@/lib/cms/blocks";
import { stripInline } from "@/lib/cms/inlineLinks";

type Obj = Record<string, unknown>;
const bi = (v: unknown) => {
  const o = (v ?? {}) as { en?: string; ar?: string };
  // Structured data carries the visible text only, never the [link](address) markup.
  return { en: stripInline(o.en ?? "").trim(), ar: stripInline(o.ar ?? "").trim() };
};

import { schemaHours, type HoursRow } from "@/lib/locations/locations";

// A real branch (office) of the company: the only thing that ever gets a street address in structured data.
export type JsonLdBranch = {
  slug: string; nameEn: string; streetEn: string; localityEn: string; regionEn: string; addressEn: string; postalCode: string;
  latitude: number; longitude: number; phone: string; email: string; mapsUrl: string; appleMapsUrl: string; businessProfileUrl: string;
  images: string[]; hours: HoursRow[]; coverage: string[]; faqs: { question: string; answer: string }[];
};
export type JsonLdArea = { nameEn: string; kind: string; latitude?: number | null; longitude?: number | null; mapsUrl?: string; serviceNames: string[]; branches?: JsonLdBranch[] };

export type JsonLdPage = {
  slug: string; type: string; titleEn: string; blocks: Block[]; area?: JsonLdArea | null;
  // The page this one sits under in the page tree (for the breadcrumb trail).
  parent?: { slug: string; titleEn: string } | null;
  seo: { descriptionEn?: string; ogImage?: string };
  publishedAt?: string; updatedAt?: string;
};
export type JsonLdSite = {
  origin: string; name: string; phone?: string; email?: string; address?: string; businessProfileUrl?: string; sameAs?: string[];
};

// Structured data is generated from typed page data, never hand-written, so it can't drift from the page.
export function buildJsonLd(page: JsonLdPage, site: JsonLdSite): Obj[] {
  const url = `${site.origin}/${page.slug}`;
  const out: Obj[] = [];

  out.push({
    "@context": "https://schema.org", "@type": "WebPage", name: page.titleEn, url,
    ...(page.seo.descriptionEn?.trim() ? { description: page.seo.descriptionEn.trim() } : {}),
    ...(page.updatedAt ? { dateModified: page.updatedAt } : {}),
    isPartOf: { "@type": "WebSite", name: site.name, url: site.origin },
  });
  const crumbs = [{ name: "Home", item: site.origin }, ...(page.parent ? [{ name: page.parent.titleEn, item: `${site.origin}/${page.parent.slug}` }] : []), { name: page.titleEn, item: url }];
  out.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })) });

  // FAQPage only where the page really has an FAQ block with questions.
  // The FAQs a branch shows on its emirate page count too: they are on the page, so they belong in the structured data.
  const questions = [
    ...page.blocks.filter((b) => !b.hidden && b.type === "faq").flatMap((b) => ((b.props.items as { question: unknown; answer: unknown }[]) ?? [])).map((q) => ({ name: bi(q.question).en, text: bi(q.answer).en })),
    ...(page.type === "area" ? (page.area?.branches ?? []).flatMap((b) => b.faqs.map((f) => ({ name: f.question, text: f.answer }))) : []),
  ];
  if (questions.length) {
    out.push({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: questions.map((q) => ({ "@type": "Question", name: q.name, acceptedAnswer: { "@type": "Answer", text: q.text } })),
    });
  }

  if (page.type === "service") {
    out.push({
      "@context": "https://schema.org", "@type": "Service", name: page.titleEn, url,
      provider: { "@type": "Organization", name: site.name, url: site.origin, ...(site.phone ? { telephone: site.phone } : {}) },
    });
  }
  // Area (emirate) pages. A real branch gets its own LocalBusiness: unique @id, its own address, coordinates, phone and hours, and the areas it
  // serves. An area without a branch gets NO address and no LocalBusiness (only the services it is served for): a service area is not an office.
  if (page.type === "area" && page.area) {
    const a = page.area;
    const areaServed = { "@type": a.kind === "emirate" ? "AdministrativeArea" : "City", name: a.nameEn, containedInPlace: { "@type": "Country", name: "United Arab Emirates" } };
    const absolute = (u: string) => (u.startsWith("/") ? `${site.origin}${u}` : u);
    for (const b of a.branches ?? []) {
      const sameAs = [...new Set([b.businessProfileUrl, b.appleMapsUrl, ...(site.sameAs ?? [])].filter(Boolean))];
      out.push({
        "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness", "@id": `${url}#branch-${b.slug}`,
        name: b.nameEn, url,
        ...(b.phone ? { telephone: b.phone.replace(/[^\d+]/g, "") } : {}),
        ...(b.email ? { email: b.email } : {}),
        address: { "@type": "PostalAddress", streetAddress: b.streetEn || b.addressEn, addressLocality: b.localityEn || a.nameEn, addressRegion: b.regionEn || a.nameEn, ...(b.postalCode ? { postalCode: b.postalCode } : {}), addressCountry: "AE" },
        geo: { "@type": "GeoCoordinates", latitude: b.latitude, longitude: b.longitude },
        ...(b.mapsUrl ? { hasMap: b.mapsUrl } : {}),
        ...(b.images.length ? { image: b.images.map(absolute) } : {}),
        ...(b.hours.length ? { openingHoursSpecification: schemaHours(b.hours) } : {}),
        areaServed: [areaServed, ...b.coverage.map((name) => ({ "@type": "Place", name }))],
        ...(sameAs.length ? { sameAs } : {}),
        parentOrganization: { "@type": "Organization", name: site.name, url: site.origin },
      });
    }
    for (const name of a.serviceNames.slice(0, 10)) {
      out.push({ "@context": "https://schema.org", "@type": "Service", name, url, provider: { "@type": "Organization", name: site.name, url: site.origin }, areaServed });
    }
  }
  if (page.type === "article") {
    out.push({
      "@context": "https://schema.org", "@type": "Article", headline: page.titleEn, mainEntityOfPage: url,
      author: { "@type": "Organization", name: site.name },
      ...(page.publishedAt ? { datePublished: page.publishedAt } : {}),
      ...(page.updatedAt ? { dateModified: page.updatedAt } : {}),
      ...(page.seo.ogImage?.startsWith("http") ? { image: page.seo.ogImage } : {}),
    });
  }
  return out;
}

const nonEmpty = (v: unknown) => typeof v === "string" && v.trim().length > 0;

// Required-field checks per schema type. Returns human-readable problems; empty = valid.
export function jsonLdProblems(items: Obj[]): string[] {
  const problems: string[] = [];
  for (const item of items) {
    const type = item["@type"];
    if (type === "WebPage" && (!nonEmpty(item.name) || !nonEmpty(item.url))) problems.push("WebPage data needs a name and URL.");
    if (type === "BreadcrumbList") {
      const list = (item.itemListElement as Obj[]) ?? [];
      if (list.length === 0 || list.some((l) => !nonEmpty(l.name) || !nonEmpty(l.item) || typeof l.position !== "number")) problems.push("Breadcrumb data is incomplete.");
    }
    if (type === "FAQPage") {
      const main = (item.mainEntity as Obj[]) ?? [];
      main.forEach((q, i) => {
        const text = (q.acceptedAnswer as Obj | undefined)?.text;
        if (!nonEmpty(q.name) || !nonEmpty(text)) problems.push(`FAQ question ${i + 1} needs both an English question and an English answer (structured data requires them).`);
      });
      if (main.length === 0) problems.push("FAQ structured data has no questions.");
    }
    if (type === "HomeAndConstructionBusiness") {
      const geo = item.geo as Obj | undefined;
      const address = item.address as Obj | undefined;
      if (!nonEmpty(item["@id"])) problems.push("Each branch needs its own structured-data id.");
      if (!nonEmpty(item.name) || !nonEmpty(item.telephone)) problems.push("A branch needs a name and a phone number (Website → Locations).");
      if (!nonEmpty(address?.streetAddress) || !nonEmpty(address?.addressLocality)) problems.push("A branch needs its street address (Website → Locations).");
      if (!geo || typeof geo.latitude !== "number" || typeof geo.longitude !== "number") problems.push("A branch needs numeric coordinates.");
      if (!Array.isArray(item.areaServed) || item.areaServed.length === 0) problems.push("Local business data needs the area it serves.");
    }
    if (type === "Service") {
      if (!nonEmpty(item.name) || !nonEmpty((item.provider as Obj | undefined)?.name)) problems.push("Service data needs a name and a provider.");
    }
    if (type === "Article") {
      if (!nonEmpty(item.headline) || !nonEmpty((item.author as Obj | undefined)?.name)) problems.push("Article data needs a headline and an author.");
    }
  }
  return problems;
}
