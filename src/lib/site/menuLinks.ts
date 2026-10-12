import { isBuiltInSlug } from "@/lib/cms/pageRules";

type Item = { url: string; children?: Item[] };

// A menu link to a page that exists in the admin but is not published would show visitors "page not found". Hide those
// links until the page goes live. Built-in routes (/about…) always exist, so a draft with such an address never hides them.
// A heading left with no link and no sub-items is dropped too.
export function hideUnpublishedLinks<T extends Item>(items: T[], draftSlugs: ReadonlySet<string>): T[] {
  const dead = (url: string) => {
    const m = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(url);
    return !!m && draftSlugs.has(m[1]) && !isBuiltInSlug(m[1]);
  };
  const out: T[] = [];
  for (const item of items) {
    if (item.url && dead(item.url)) continue;
    const children = item.children ? hideUnpublishedLinks(item.children as T[], draftSlugs) : undefined;
    if (!item.url && item.children && children && children.length === 0) continue;
    out.push(children ? { ...item, children } : item);
  }
  return out;
}
