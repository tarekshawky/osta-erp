// What the menu editor does to a menu: types, tree edits, and the "Menu health" checks. Pure code (no database, no React), tested on its own.
import { MENU_MAX_DEPTH } from "./menuTree";
import { AREAS_MENU_URL, SERVICES_MENU_URL, isAutoUrl, isSafeLink, type MenuItemInput } from "./siteRules";

export type MenuNode = {
  uid: string;
  labelEn: string; labelAr: string; url: string;
  visible: boolean; showDesktop: boolean; showMobile: boolean; newTab: boolean;
  style: "link" | "button";
  badgeEn: string; badgeAr: string;
  // Only for the editor: which of Page / Link the owner chose while the address is still empty or hand-typed. Not saved.
  pick?: "page" | "link" | "heading";
  children: MenuNode[];
};

export type ItemType = "page" | "link" | "heading" | "button" | "auto";
export const TYPE_LABEL: Record<ItemType, string> = { page: "Page", link: "Link", heading: "Dropdown", button: "Button", auto: "Auto list" };

let counter = 0;
export const newUid = () => `m${Date.now().toString(36)}-${(counter += 1)}`;

export const blankNode = (patch: Partial<MenuNode> = {}): MenuNode => ({
  uid: newUid(), labelEn: "", labelAr: "", url: "", visible: true, showDesktop: true, showMobile: true, newTab: false, style: "link", badgeEn: "", badgeAr: "", children: [], ...patch,
});

export const toNodes = (items: MenuItemInput[]): MenuNode[] =>
  items.map((i) => blankNode({ ...i, style: i.style === "button" ? "button" : "link", badgeEn: i.badgeEn ?? "", badgeAr: i.badgeAr ?? "", children: toNodes(i.children) }));

export const toInput = (nodes: MenuNode[]): MenuItemInput[] =>
  nodes.map((n) => ({ labelEn: n.labelEn, labelAr: n.labelAr, url: n.url, visible: n.visible, showDesktop: n.showDesktop, showMobile: n.showMobile, newTab: n.newTab, style: n.style, badgeEn: n.badgeEn, badgeAr: n.badgeAr, children: toInput(n.children) }));

export function typeOf(n: MenuNode, pageUrls: ReadonlySet<string>): ItemType {
  if (isAutoUrl(n.url)) return "auto";
  if (n.style === "button") return "button";
  if (n.pick === "heading") return "heading";
  if (n.url === "") return n.pick ?? (n.children.length ? "heading" : "page");
  if (n.pick === "link") return "link";
  return pageUrls.has(n.url) ? "page" : n.pick ?? "link";
}

// ---- finding and changing ------------------------------------------------------------------------------------------------------------

export type Found = { node: MenuNode; parent: MenuNode | null; siblings: MenuNode[]; index: number; depth: number };

export function findNode(tree: MenuNode[], uid: string, parent: MenuNode | null = null, depth = 1): Found | null {
  for (let index = 0; index < tree.length; index++) {
    const node = tree[index];
    if (node.uid === uid) return { node, parent, siblings: tree, index, depth };
    const deeper = findNode(node.children, uid, node, depth + 1);
    if (deeper) return deeper;
  }
  return null;
}

// The uids from the top item down to this one (used to open the right dropdowns in the preview).
export function pathTo(tree: MenuNode[], uid: string): string[] {
  for (const n of tree) {
    if (n.uid === uid) return [uid];
    const rest = pathTo(n.children, uid);
    if (rest.length) return [n.uid, ...rest];
  }
  return [];
}

// Rebuilds the tree, replacing the list that holds `uid` (or a node's children) with what `change` returns.
function editList(tree: MenuNode[], uid: string, change: (list: MenuNode[], index: number) => MenuNode[]): MenuNode[] {
  const index = tree.findIndex((n) => n.uid === uid);
  if (index >= 0) return change(tree, index);
  return tree.map((n) => (n.children.length ? { ...n, children: editList(n.children, uid, change) } : n));
}

export const updateNode = (tree: MenuNode[], uid: string, patch: Partial<MenuNode>): MenuNode[] => editList(tree, uid, (l, i) => l.map((n, j) => (j === i ? { ...n, ...patch } : n)));
export const removeNode = (tree: MenuNode[], uid: string): MenuNode[] => editList(tree, uid, (l, i) => l.filter((_, j) => j !== i));

export const cloneNode = (n: MenuNode): MenuNode => ({ ...n, uid: newUid(), children: n.children.map(cloneNode) });
export function duplicateNode(tree: MenuNode[], uid: string): { tree: MenuNode[]; uid: string | null } {
  const found = findNode(tree, uid);
  if (!found) return { tree, uid: null };
  const copy = cloneNode(found.node);
  return { tree: editList(tree, uid, (l, i) => [...l.slice(0, i + 1), copy, ...l.slice(i + 1)]), uid: copy.uid };
}

export function addNode(tree: MenuNode[], node: MenuNode, parentUid: string | null = null): MenuNode[] {
  if (!parentUid) return [...tree, node];
  const found = findNode(tree, parentUid);
  return found ? updateNode(tree, parentUid, { children: [...found.node.children, node] }) : tree;
}

// Dragging reorders items that share the same parent; dropping onto an item elsewhere does nothing (use Indent / Outdent for levels).
export function moveSibling(tree: MenuNode[], uid: string, overUid: string): MenuNode[] {
  return editList(tree, uid, (list, from) => {
    const to = list.findIndex((n) => n.uid === overUid);
    if (to < 0 || to === from) return list;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  });
}

export const height = (n: MenuNode): number => 1 + Math.max(0, ...n.children.map(height));
export const countNodes = (tree: MenuNode[]): number => tree.reduce((a, n) => a + 1 + countNodes(n.children), 0);
export const depthOf = (tree: MenuNode[]): number => Math.max(0, ...tree.map(height));

export function canIndent(tree: MenuNode[], uid: string): boolean {
  const f = findNode(tree, uid);
  return !!f && f.index > 0 && !isAutoUrl(f.node.url) && f.depth + height(f.node) <= MENU_MAX_DEPTH;
}
export function indentNode(tree: MenuNode[], uid: string): MenuNode[] {
  if (!canIndent(tree, uid)) return tree;
  return editList(tree, uid, (list, i) => {
    const prev = list[i - 1];
    return [...list.slice(0, i - 1), { ...prev, children: [...prev.children, list[i]] }, ...list.slice(i + 1)];
  });
}
export function outdentNode(tree: MenuNode[], uid: string): MenuNode[] {
  const f = findNode(tree, uid);
  if (!f || !f.parent) return tree;
  const without = removeNode(tree, uid);
  const parentUid = f.parent.uid;
  return editList(without, parentUid, (list, i) => [...list.slice(0, i + 1), f.node, ...list.slice(i + 1)]);
}

// ---- Menu health ---------------------------------------------------------------------------------------------------------------------

export type KnownLinks = { live: ReadonlySet<string>; drafts: ReadonlySet<string>; prefixes: readonly string[] };
export type IssueKind = "duplicate" | "broken" | "draft" | "depth" | "incomplete";
export type Issue = { kind: IssueKind; uid: string; message: string; twin?: string };

export const pathOf = (url: string) => {
  const p = url.trim().split(/[?#]/)[0];
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
};
// What two items must share to count as the same address. "#areas" and "#services" (and any bare "#…") are addresses of their own.
export const addressKey = (url: string) => pathOf(url) || url.trim();
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const name = (n: MenuNode) => n.labelEn.trim() || n.labelAr.trim() || "Untitled item";

export function linkState(url: string, known: KnownLinks): "ok" | "draft" | "broken" {
  const u = url.trim();
  if (u === "" || isAutoUrl(u)) return "ok";
  if (!isSafeLink(u) || u.startsWith("//")) return "broken";
  // Other websites, phone numbers and emails cannot be checked from here.
  if (!u.startsWith("/")) return "ok";
  const p = pathOf(u);
  if (known.live.has(p) || known.prefixes.some((x) => p.startsWith(x))) return "ok";
  return known.drafts.has(p) ? "draft" : "broken";
}

export function menuIssues(tree: MenuNode[], known: KnownLinks): Issue[] {
  const out: Issue[] = [];
  const seen = new Map<string, string>(); // "address|name" -> first uid
  const walk = (list: MenuNode[], depth: number) => {
    const siblingUrls = new Map<string, string>();
    for (const n of list) {
      const url = n.url.trim();
      if (url) {
        const key = `${addressKey(url)}|${norm(n.labelEn)}`;
        // The same address and name anywhere, or the same address twice side by side. (A parent and its sub-item may share an address.)
        const twin = seen.get(key) ?? siblingUrls.get(addressKey(url));
        if (twin) out.push({ kind: "duplicate", uid: n.uid, twin, message: `“${name(n)}” appears twice` });
        else { seen.set(key, n.uid); siblingUrls.set(addressKey(url), n.uid); }
      }
      const state = linkState(url, known);
      if (state === "broken") out.push({ kind: "broken", uid: n.uid, message: `“${name(n)}” links to ${url}, which does not exist` });
      if (state === "draft") out.push({ kind: "draft", uid: n.uid, message: `“${name(n)}” links to a page that is not published, so visitors do not see it` });
      if (depth > MENU_MAX_DEPTH) out.push({ kind: "depth", uid: n.uid, message: `“${name(n)}” is deeper than ${MENU_MAX_DEPTH} levels` });
      if (!n.labelEn.trim() || !n.labelAr.trim()) out.push({ kind: "incomplete", uid: n.uid, message: `“${name(n)}” needs an English and an Arabic name` });
      else if (!url && !n.children.length) out.push({ kind: "incomplete", uid: n.uid, message: `“${name(n)}” needs a link, or sub-items if it is a dropdown heading` });
      walk(n.children, depth + 1);
    }
  };
  walk(tree, 1);
  return out;
}

// What "Fix" can do on its own. A broken or unpublished link and a missing name need the owner's choice, so those open the item instead.
export const canAutoFix = (i: Issue) => i.kind === "duplicate" || i.kind === "depth";

export function fixIssue(tree: MenuNode[], issue: Issue): MenuNode[] {
  if (issue.kind === "duplicate") {
    const extra = findNode(tree, issue.uid);
    if (!extra) return tree;
    const without = removeNode(tree, issue.uid);
    // Sub-items of the removed copy move to the one that stays, unless it already has the same ones.
    const twin = issue.twin ? findNode(without, issue.twin) : null;
    if (!twin || !extra.node.children.length) return without;
    const have = new Set(twin.node.children.map((c) => `${addressKey(c.url)}|${norm(c.labelEn)}`));
    const more = extra.node.children.filter((c) => !have.has(`${addressKey(c.url)}|${norm(c.labelEn)}`));
    return more.length ? updateNode(without, twin.node.uid, { children: [...twin.node.children, ...more] }) : without;
  }
  if (issue.kind === "depth") {
    let next = tree;
    for (let guard = 0; guard < 20; guard++) {
      const f = findNode(next, issue.uid);
      if (!f || f.depth <= MENU_MAX_DEPTH) break;
      next = outdentNode(next, issue.uid);
    }
    return next;
  }
  return tree;
}

// The five menus, in the order of the tabs in the editor.
export const MENU_TABS = [
  { key: "header", label: "Header", note: "The top bar of the website." },
  { key: "footer", label: "Footer", note: "The footer quick links." },
  { key: "mobile", label: "Mobile", note: "Optional. While it is empty, phones use the Header menu." },
  { key: "services", label: "Services column", note: "The footer column “Services”." },
  { key: "locations", label: "Locations column", note: "The footer column “Locations”." },
] as const;

export const AUTO_LABEL: Record<string, { en: string; ar: string; source: string }> = {
  [AREAS_MENU_URL]: { en: "Areas We Cover", ar: "المناطق التي نغطيها", source: "Service Areas" },
  [SERVICES_MENU_URL]: { en: "Services", ar: "الخدمات", source: "Website Services" },
};
