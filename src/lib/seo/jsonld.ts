import type { Block } from "@/lib/cms/blocks";

type Obj = Record<string, unknown>;
const bi = (v: unknown) => {
  const o = (v ?? {}) as { en?: string; ar?: string };
  return { en: (o.en ?? "").trim(), ar: (o.ar ?? "").trim() };
};

export type JsonLdPage = {
  slug: string; type: string; titleEn: string; blocks: Block[];
  seo: { descriptionEn?: string; ogImage?: string };
  publishedAt?: string; updatedAt?: string;
};
export type JsonLdSite = { origin: string; name: string; phone?: string };

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
  out.push({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site.origin },
      { "@type": "ListItem", position: 2, name: page.titleEn, item: url },
    ],
  });

  // FAQPage only where the page really has an FAQ block with questions.
  const questions = page.blocks.filter((b) => !b.hidden && b.type === "faq").flatMap((b) => ((b.props.items as { question: unknown; answer: unknown }[]) ?? []));
  if (questions.length) {
    out.push({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: questions.map((q) => ({ "@type": "Question", name: bi(q.question).en, acceptedAnswer: { "@type": "Answer", text: bi(q.answer).en } })),
    });
  }

  if (page.type === "service") {
    out.push({
      "@context": "https://schema.org", "@type": "Service", name: page.titleEn, url,
      provider: { "@type": "Organization", name: site.name, url: site.origin, ...(site.phone ? { telephone: site.phone } : {}) },
    });
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
    if (type === "Service") {
      if (!nonEmpty(item.name) || !nonEmpty((item.provider as Obj | undefined)?.name)) problems.push("Service data needs a name and a provider.");
    }
    if (type === "Article") {
      if (!nonEmpty(item.headline) || !nonEmpty((item.author as Obj | undefined)?.name)) problems.push("Article data needs a headline and an author.");
    }
  }
  return problems;
}
