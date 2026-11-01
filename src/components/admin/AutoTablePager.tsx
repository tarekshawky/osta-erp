"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

// Search and filter for EVERY table in the admin (8 rows or more): a search box over all the text of a row, and a dropdown for each
// column that has only a few different values (Status, Type …). Not added where the page already has its own search, for tables
// with a select-all checkbox, documents, or tables marked data-no-filter.
//
// Pages EVERY long table in the admin, with no change to the table's own code: any table with more than PAGE_MIN rows gets
// "Showing 1–25 of 143", Previous/Next, page numbers and a rows-per-page choice. The rows stay in the page (they are only hidden),
// so it also works for tables that are filtered or edited in the browser, and printing always shows every row.
// Left alone: tables marked data-no-paginate (documents such as invoices and statements), tables that already have the
// server-side pager next to them, tables with a select-all checkbox (a bulk action must not reach rows you can't see), and
// small tables.

const PAGE_MIN = 25;
const SEARCH_MIN = 8;
const SIZES = [25, 50, 100, 0]; // 0 = all
const STORE = "osta_admin_table_size";

type Group = HTMLTableRowElement[];

// A row plus the full-width detail rows that follow it (one cell spanning the table) move together.
function groupsOf(table: HTMLTableElement): Group[] {
  const body = table.tBodies[0];
  if (!body) return [];
  const groups: Group[] = [];
  for (const row of Array.from(body.rows)) {
    const detail = row.cells.length === 1 && row.cells[0].colSpan > 1;
    if (detail && groups.length) groups[groups.length - 1].push(row);
    else groups.push([row]);
  }
  return groups;
}

const isFiltered = (g: Group) => g[0].hasAttribute("data-osta-filtered");
const squash = (t: string | null) => (t ?? "").replace(/\s+/g, " ").trim();

function rowText(g: Group): string {
  return g.map((r) => squash(r.textContent) + " " + Array.from(r.querySelectorAll("input:not([type=checkbox]):not([type=radio]), textarea")).map((i) => (i as HTMLInputElement).value).join(" ")).join(" ").toLowerCase();
}

type ColumnFilter = { index: number; label: string; values: string[] };

// Columns with a handful of different short values: they get a dropdown.
function columnsOf(table: HTMLTableElement): ColumnFilter[] {
  const head = table.tHead?.rows[table.tHead.rows.length - 1];
  if (!head) return [];
  const n = head.cells.length;
  const groups = groupsOf(table).filter((g) => g[0].cells.length === n);
  const out: ColumnFilter[] = [];
  for (let i = 0; i < n && out.length < 3; i++) {
    const label = squash(head.cells[i].textContent);
    if (!label) continue;
    const values = new Set<string>();
    for (const g of groups) values.add(squash(g[0].cells[i].textContent));
    const list = [...values];
    if (list.length < 2 || list.length > 12 || list.length >= groups.length || list.some((v) => v.length > 40 || v === "") || list.every((v) => /^[\d.,:\-/\s]+$/.test(v))) continue;
    out.push({ index: i, label, values: list.sort((a, b) => a.localeCompare(b)) });
  }
  return out;
}

// Marks the rows that do not match the search / column choices; returns how many rows match.
function applyFilter(table: HTMLTableElement, query: string, cols: Record<number, string>): number {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const choices = Object.entries(cols).filter(([, v]) => v !== "");
  let matches = 0;
  for (const g of groupsOf(table)) {
    const ok = terms.every((t) => rowText(g).includes(t)) && choices.every(([i, v]) => squash(g[0].cells[Number(i)]?.textContent) === v);
    for (const row of g) { if (ok) row.removeAttribute("data-osta-filtered"); else row.setAttribute("data-osta-filtered", ""); }
    if (ok) matches++;
  }
  return matches;
}

const clearMarks = (table: HTMLTableElement) => table.querySelectorAll("[data-osta-hidden], [data-osta-filtered]").forEach((r) => { r.removeAttribute("data-osta-hidden"); r.removeAttribute("data-osta-filtered"); });

// Our own search box must not make a table look like it already has one.
const hasOwnSearch = (table: HTMLTableElement) => {
  let el: HTMLElement | null = table;
  for (let i = 0; i < 2 && el; i++) { // the table's wrapper and its section: wider would mistake another table's search for this one's
    el = el.parentElement;
    if (el && Array.from(el.querySelectorAll('input[type="search"], input[placeholder*="earch" i]')).some((x) => !x.closest("[data-osta-tools-host]"))) return true;
  }
  return false;
};

function searchEligible(table: HTMLTableElement): boolean {
  if (table.closest("[data-no-paginate], [data-no-filter]") || table.tBodies.length !== 1) return false;
  if (table.tHead?.querySelector('input[type="checkbox"]')) return false;
  let el: HTMLElement | null = table;
  for (let i = 0; i < 3 && el; i++) {
    el = el.parentElement;
    if (el?.querySelector("[data-osta-paged]")) return false;
  }
  return groupsOf(table).length >= SEARCH_MIN && !hasOwnSearch(table);
}

function eligible(table: HTMLTableElement): boolean {
  if (table.closest("[data-no-paginate]") || table.tBodies.length !== 1) return false;
  if (table.tHead?.querySelector('input[type="checkbox"]')) return false;
  let el: HTMLElement | null = table;
  for (let i = 0; i < 3 && el; i++) {
    el = el.parentElement;
    if (el?.querySelector("[data-osta-paged]")) return false;
  }
  return groupsOf(table).length > PAGE_MIN;
}

function readSize(): number {
  try {
    const raw = localStorage.getItem(STORE);
    const v = raw === null ? NaN : Number(raw); // nothing saved yet = the default size (not "all")
    return SIZES.includes(v) ? v : PAGE_MIN;
  } catch {
    return PAGE_MIN;
  }
}

function pageList(page: number, pages: number): (number | "…")[] {
  const all = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...all].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => { if (i && n - sorted[i - 1] > 1) out.push("…"); out.push(n); });
  return out;
}

// Shows only the rows of the current page. Plain DOM work (no React state), so rows added later can be handled the same way.
function paint(table: HTMLTableElement, size: number, page: number) {
  const groups = groupsOf(table).filter((g) => !isFiltered(g));
  const per = size === 0 ? groups.length || 1 : size;
  const pages = Math.max(1, Math.ceil(groups.length / per));
  const from = (Math.min(page, pages) - 1) * per;
  groups.forEach((g, i) => {
    const hide = size !== 0 && (i < from || i >= from + per);
    for (const row of g) { if (hide) row.setAttribute("data-osta-hidden", ""); else row.removeAttribute("data-osta-hidden"); }
  });
}

function TableTools({ table, search, pager, top, bottom }: { table: HTMLTableElement; search: boolean; pager: boolean; top: HTMLElement; bottom: HTMLElement }) {
  // Rendered only in the browser after the page has loaded, so reading the saved size here is safe.
  const [size, setSize] = useState(readSize);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(() => groupsOf(table).length);
  const [matches, setMatches] = useState(() => groupsOf(table).length);
  const [query, setQuery] = useState("");
  const [cols, setCols] = useState<Record<number, string>>({});
  const [options, setOptions] = useState(() => columnsOf(table));
  const latest = useRef({ size, page, query, cols });

  useEffect(() => { latest.current = { size, page, query, cols }; });
  const count = search ? matches : total;
  const pagesNow = Math.max(1, Math.ceil(count / (size === 0 ? count || 1 : size)));
  const currentNow = Math.min(page, pagesNow);
  useEffect(() => { if (pager) paint(table, size, currentNow); }, [table, pager, size, currentNow, count]);

  // The table lost its search (too few rows now, or the page got its own): show every row again.
  useEffect(() => { if (!search) table.querySelectorAll("[data-osta-filtered]").forEach((r) => r.removeAttribute("data-osta-filtered")); }, [table, search]);

  // Rows added, removed or swapped (a save, a refresh): count again, filter again and show the right ones.
  useEffect(() => {
    const body = table.tBodies[0];
    if (!body) return;
    const mo = new MutationObserver(() => {
      const l = latest.current;
      setTotal(groupsOf(table).length);
      setOptions(columnsOf(table));
      setMatches(applyFilter(table, l.query, l.cols));
      paint(table, l.size, l.page);
    });
    mo.observe(body, { childList: true });
    return () => mo.disconnect();
  }, [table]);

  // Leaving the page (or switching to "all") must not leave rows hidden.
  useEffect(() => () => clearMarks(table), [table]);

  function refilter(nextQuery: string, nextCols: Record<number, string>) {
    setQuery(nextQuery);
    setCols(nextCols);
    setPage(1);
    setMatches(applyFilter(table, nextQuery, nextCols));
  }

  const per = size === 0 ? count || 1 : size;
  const pages = Math.max(1, Math.ceil(count / per));
  const current = Math.min(page, pages);
  const from = count === 0 ? 0 : (current - 1) * per + 1;
  const to = size === 0 ? count : Math.min(count, current * per);
  const go = (p: number) => { setPage(Math.min(Math.max(1, p), pages)); table.scrollIntoView({ behavior: "smooth", block: "nearest" }); };
  const btn = "rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium";
  const filtering = query.trim() !== "" || Object.values(cols).some((v) => v !== "");

  const bar = search && (
    <div className="osta-table-search mb-2 flex flex-wrap items-center gap-2 text-sm">
      <input
        type="search"
        value={query}
        onChange={(e) => refilter(e.target.value, cols)}
        placeholder="Search this table…"
        aria-label="Search this table"
        className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {options.map((c) => (
        <select
          key={c.index}
          value={cols[c.index] ?? ""}
          onChange={(e) => refilter(query, { ...cols, [c.index]: e.target.value })}
          aria-label={`Filter by ${c.label}`}
          className="max-w-[12rem] rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
        >
          <option value="">All {c.label}</option>
          {c.values.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      ))}
      {filtering && <button type="button" onClick={() => refilter("", {})} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50">Clear</button>}
      {filtering && <span className="text-slate-500" role="status">{matches === 0 ? "No rows match." : `${matches} of ${total} rows`}</span>}
    </div>
  );

  const controls = pager && (
    <div className="osta-pager flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm" role="navigation" aria-label="Table pages">
      <div className="flex flex-wrap items-center gap-3 text-slate-500">
        <span>Showing {from}–{to} of {count}{search && filtering ? ` (filtered from ${total})` : ""}</span>
        <label className="flex items-center gap-1.5">
          Rows
          <select
            value={size}
            onChange={(e) => { const v = Number(e.target.value); setSize(v); setPage(1); try { localStorage.setItem(STORE, String(v)); } catch { /* ignore */ } }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
          >
            {SIZES.map((s) => <option key={s} value={s}>{s === 0 ? "All" : s}</option>)}
          </select>
        </label>
      </div>
      {size !== 0 && pages > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" disabled={current <= 1} onClick={() => go(current - 1)} className={`${btn} ${current <= 1 ? "text-slate-300" : "text-slate-700 hover:bg-slate-50"}`}>Previous</button>
          {pageList(current, pages).map((n, i) => n === "…"
            ? <span key={`e${i}`} className="px-1 text-slate-400">…</span>
            : <button key={n} type="button" aria-current={n === current ? "page" : undefined} onClick={() => go(n)} className={`${btn} ${n === current ? "border-blue-600 bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}>{n}</button>)}
          <button type="button" disabled={current >= pages} onClick={() => go(current + 1)} className={`${btn} ${current >= pages ? "text-slate-300" : "text-slate-700 hover:bg-slate-50"}`}>Next</button>
        </div>
      )}
    </div>
  );

  return <>{bar ? createPortal(bar, top) : null}{controls ? createPortal(controls, bottom) : null}</>;
}

type Entry = { table: HTMLTableElement; top: HTMLDivElement; bottom: HTMLDivElement; search: boolean; pager: boolean };

export function AutoTablePager() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const hosts = new Map<HTMLTableElement, { top: HTMLDivElement; bottom: HTMLDivElement }>();
    let frame = 0;
    const host = () => {
      const el = document.createElement("div");
      el.dataset.ostaPagerHost = "1";
      el.dataset.ostaToolsHost = "1";
      return el;
    };
    const scan = () => {
      frame = 0;
      const next: Entry[] = [];
      const live = new Set<HTMLTableElement>();
      for (const table of Array.from(document.querySelectorAll("table"))) {
        const pager = eligible(table);
        const search = searchEligible(table);
        if (!pager && !search) continue;
        live.add(table);
        let h = hosts.get(table);
        if (!h) {
          h = { top: host(), bottom: host() };
          // around the table's scrolling wrapper when it has one, so the controls stay put while the table scrolls sideways
          const wrap = table.parentElement && /overflow-x-auto|overflow-auto/.test(table.parentElement.className) ? table.parentElement : table;
          wrap.before(h.top);
          wrap.after(h.bottom);
          hosts.set(table, h);
        }
        next.push({ table, top: h.top, bottom: h.bottom, search, pager });
      }
      for (const [table, h] of hosts) {
        if (!live.has(table)) { clearMarks(table); h.top.remove(); h.bottom.remove(); hosts.delete(table); }
      }
      setEntries((prev) => (prev.length === next.length && prev.every((e, i) => e.table === next[i].table && e.top === next[i].top && e.search === next[i].search && e.pager === next[i].pager) ? prev : next));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(scan); };
    scan();
    const mo = new MutationObserver((records) => {
      // our own controls being added or removed don't need another scan
      if (records.every((r) => [...r.addedNodes, ...r.removedNodes].every((n) => n instanceof HTMLElement && n.dataset.ostaPagerHost))) return;
      schedule();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      if (frame) cancelAnimationFrame(frame);
      for (const [table, h] of hosts) { clearMarks(table); h.top.remove(); h.bottom.remove(); }
      setEntries([]);
    };
  }, [pathname]);

  return <>{entries.map(({ table, top, bottom, search, pager }, i) => <TableTools key={i} table={table} search={search} pager={pager} top={top} bottom={bottom} />)}</>;
}
