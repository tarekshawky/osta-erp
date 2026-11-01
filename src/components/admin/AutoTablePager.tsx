"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

// Pages EVERY long table in the admin, with no change to the table's own code: any table with more than PAGE_MIN rows gets
// "Showing 1–25 of 143", Previous/Next, page numbers and a rows-per-page choice. The rows stay in the page (they are only hidden),
// so it also works for tables that are filtered or edited in the browser, and printing always shows every row.
// Left alone: tables marked data-no-paginate (documents such as invoices and statements), tables that already have the
// server-side pager next to them, tables with a select-all checkbox (a bulk action must not reach rows you can't see), and
// small tables.

const PAGE_MIN = 25;
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
  const groups = groupsOf(table);
  const per = size === 0 ? groups.length || 1 : size;
  const pages = Math.max(1, Math.ceil(groups.length / per));
  const from = (Math.min(page, pages) - 1) * per;
  groups.forEach((g, i) => {
    const hide = size !== 0 && (i < from || i >= from + per);
    for (const row of g) { if (hide) row.setAttribute("data-osta-hidden", ""); else row.removeAttribute("data-osta-hidden"); }
  });
}

function Controls({ table }: { table: HTMLTableElement }) {
  // Rendered only in the browser after the page has loaded, so reading the saved size here is safe.
  const [size, setSize] = useState(readSize);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(() => groupsOf(table).length);
  const latest = useRef({ size, page });

  useEffect(() => { latest.current = { size, page }; });
  const pagesNow = Math.max(1, Math.ceil(total / (size === 0 ? total || 1 : size)));
  const currentNow = Math.min(page, pagesNow);
  useEffect(() => { paint(table, size, currentNow); }, [table, size, currentNow, total]);

  // Rows added, removed or swapped (a filter, a save, a refresh): count again and show the right ones.
  useEffect(() => {
    const body = table.tBodies[0];
    if (!body) return;
    const mo = new MutationObserver(() => { setTotal(groupsOf(table).length); paint(table, latest.current.size, latest.current.page); });
    mo.observe(body, { childList: true });
    return () => mo.disconnect();
  }, [table]);

  // Leaving the page (or switching to "all") must not leave rows hidden.
  useEffect(() => () => { table.querySelectorAll("[data-osta-hidden]").forEach((r) => r.removeAttribute("data-osta-hidden")); }, [table]);

  const per = size === 0 ? total || 1 : size;
  const pages = Math.max(1, Math.ceil(total / per));
  const current = Math.min(page, pages);
  const from = total === 0 ? 0 : (current - 1) * per + 1;
  const to = size === 0 ? total : Math.min(total, current * per);
  const go = (p: number) => { setPage(Math.min(Math.max(1, p), pages)); table.scrollIntoView({ behavior: "smooth", block: "nearest" }); };
  const btn = "rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium";

  return (
    <div className="osta-pager flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm" role="navigation" aria-label="Table pages">
      <div className="flex flex-wrap items-center gap-3 text-slate-500">
        <span>Showing {from}–{to} of {total}</span>
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
}

type Entry = { table: HTMLTableElement; host: HTMLDivElement };

export function AutoTablePager() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const hosts = new Map<HTMLTableElement, HTMLDivElement>();
    let frame = 0;
    const scan = () => {
      frame = 0;
      const next: Entry[] = [];
      const live = new Set<HTMLTableElement>();
      for (const table of Array.from(document.querySelectorAll("table"))) {
        if (!eligible(table)) continue;
        live.add(table);
        let host = hosts.get(table);
        if (!host) {
          host = document.createElement("div");
          host.dataset.ostaPagerHost = "1";
          // after the table's scrolling wrapper when it has one, so the controls stay put while the table scrolls sideways
          const wrap = table.parentElement && /overflow-x-auto|overflow-auto/.test(table.parentElement.className) ? table.parentElement : table;
          wrap.after(host);
          hosts.set(table, host);
        }
        next.push({ table, host });
      }
      for (const [table, host] of hosts) {
        if (!live.has(table)) { table.querySelectorAll("[data-osta-hidden]").forEach((r) => r.removeAttribute("data-osta-hidden")); host.remove(); hosts.delete(table); }
      }
      setEntries((prev) => (prev.length === next.length && prev.every((e, i) => e.table === next[i].table && e.host === next[i].host) ? prev : next));
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
      for (const [table, host] of hosts) { table.querySelectorAll("[data-osta-hidden]").forEach((r) => r.removeAttribute("data-osta-hidden")); host.remove(); }
      setEntries([]);
    };
  }, [pathname]);

  return <>{entries.map(({ table, host }, i) => createPortal(<Controls key={i} table={table} />, host, `t${i}`))}</>;
}
