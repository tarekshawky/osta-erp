// Global Blocks: a page stores only a small reference ({ type: "global", props: { globalId } }); before the page is served the
// reference is replaced by the global block's current content, so editing the global block updates every page that uses it.
// The page's own visibility settings (hidden / desktop / mobile) are kept for each use.

export type GlobalContent = { type: string; props: unknown };
type Raw = { type?: unknown; props?: { globalId?: unknown } } & Record<string, unknown>;

const isGlobalRef = (b: unknown): b is Raw & { props: { globalId: string } } =>
  !!b && typeof b === "object" && (b as Raw).type === "global" && typeof (b as Raw).props?.globalId === "string";

export function globalIdsIn(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) return [];
  return Array.from(new Set(blocks.filter(isGlobalRef).map((b) => b.props.globalId)));
}

// Pure part: swap each reference for its content. A reference whose global block no longer exists is dropped, never shown empty.
export function applyGlobals(blocks: unknown, contents: Map<string, GlobalContent>): unknown {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.flatMap((b) => {
    if (!isGlobalRef(b)) return [b];
    const g = contents.get(b.props.globalId);
    if (!g || g.type === "global") return [];
    return [{ ...b, type: g.type, props: g.props }];
  });
}

type Db = { cmsGlobalBlock: { findMany: (args: { where: { id: { in: string[] } }; select: { id: true; type: true; props: true } }) => Promise<{ id: string; type: string; props: unknown }[]> } };

export async function resolveGlobalBlocks(blocks: unknown, db: Db): Promise<unknown> {
  const ids = globalIdsIn(blocks);
  if (ids.length === 0) return blocks;
  let rows: { id: string; type: string; props: unknown }[] = [];
  try {
    rows = await db.cmsGlobalBlock.findMany({ where: { id: { in: ids } }, select: { id: true, type: true, props: true } });
  } catch {
    // The table is missing or the database hiccuped: serve the page without the shared blocks rather than failing it.
  }
  return applyGlobals(blocks, new Map(rows.map((r) => [r.id, { type: r.type, props: r.props }])));
}
