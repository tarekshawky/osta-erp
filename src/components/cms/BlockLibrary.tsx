"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck, BadgePercent, Bot, Droplets, Fan, FileCheck, PaintRoller, Snowflake, Wind, Zap, BookOpen, BriefcaseBusiness, Calculator, CalendarCheck, ChartNoAxesColumn, CircleDollarSign, CircleHelp, ClipboardList,
  CloudSun, Columns2, Columns3, Contact, FileText, GalleryHorizontal, GalleryThumbnails, Grid2x2, Heading, Headset, Highlighter, House, Image as ImageIcon, ImagePlus,
  Layers, LayoutGrid, Link as LinkIcon, List, ListChecks, MapPin, Megaphone, MessageCircle, Monitor, MousePointerClick, Network, Newspaper, PanelLeft, PanelRight, PanelTop, PenLine,
  Phone, Quote, Rocket, Search, ShoppingBag, Smartphone, Sparkles, SplitSquareHorizontal, Star, Table, Tablet, Type, Wrench, X,
  Award, Building2, CirclePlay, Clock, GitCommitVertical, ListOrdered, MessagesSquare, Minus, ShieldCheck, ThumbsUp, Users, Workflow,
  type LucideIcon,
} from "lucide-react";
import { listGlobalBlocks, type GlobalBlockRow } from "@/app/admin/website/global-blocks-actions";
import { LIBRARY, LIBRARY_CATEGORIES, searchLibrary, type LibraryCategory, type LibraryEntry, type Wire, type WireCell } from "@/lib/cms/blockLibrary";

// Every icon the library uses is imported by name (so the page does not ship the whole icon set).
const ICONS: Record<string, LucideIcon> = {
  Droplets, Fan, FileCheck, PaintRoller, Snowflake, Wind, Zap,
  BadgeCheck, BadgePercent, Bot, BookOpen, BriefcaseBusiness, Calculator, CalendarCheck, ChartNoAxesColumn, CircleDollarSign, CircleHelp, ClipboardList,
  CloudSun, Columns2, Columns3, Contact, FileText, GalleryHorizontal, GalleryThumbnails, Grid2x2, Heading, Headset, Highlighter, House, Image: ImageIcon, ImagePlus,
  Layers, LayoutGrid, Link: LinkIcon, List, ListChecks, MapPin, Megaphone, MessageCircle, MousePointerClick, Network, Newspaper, PanelLeft, PanelRight, PanelTop, PenLine,
  Phone, Quote, Rocket, ShoppingBag, Sparkles, SplitSquareHorizontal, Star, Table, Type, Wrench,
  Award, Building2, CirclePlay, Clock, GitCommitVertical, ListOrdered, MessagesSquare, Minus, ShieldCheck, ThumbsUp, Users, Workflow,
};

export function LibraryIcon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICONS[name] ?? LayoutGrid;
  return <Icon size={size} className={className} aria-hidden />;
}

// "Recently used" and "Favorites" are remembered per browser; "Recommended" is a fixed shortlist for building a landing page.
const RECENT_KEY = "osta-block-library-recent";
const FAVORITE_KEY = "osta-block-library-favorites";
const RECOMMENDED = ["service-showcase", "benefits", "pricing", "book-now", "multi-cta", "contact-banner", "promo", "gallery", "faq", "announcement", "before-after", "check-list"];

function readIds(key: string): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && LIBRARY.some((e) => e.id === x)) : [];
  } catch {
    return [];
  }
}
function writeIds(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Not remembering is fine.
  }
}

type View = LibraryCategory | "all" | "recent" | "favorites" | "recommended" | "global";

export type Device = "desktop" | "tablet" | "mobile";
const DEVICES: { id: Device; label: string; Icon: LucideIcon; width: string }[] = [
  { id: "desktop", label: "Desktop", Icon: Monitor, width: "100%" },
  { id: "tablet", label: "Tablet", Icon: Tablet, width: "72%" },
  { id: "mobile", label: "Mobile", Icon: Smartphone, width: "38%" },
];

// ---- wireframe drawing (sizes are in em, so the same drawing works as a thumbnail and as a large preview) ----
const line = (w: string, dark: boolean, h = 0.45) => <div style={{ width: w, height: `${h}em` }} className={`rounded-full ${dark ? "bg-white/70" : "bg-slate-300"}`} />;

function Cell({ c, dark, tone }: { c: WireCell; dark: boolean; tone: Wire["tone"] }) {
  const ink = dark ? "bg-white" : "bg-slate-700";
  const box = dark ? "bg-white/20" : "bg-slate-200";
  const accent = tone === "dark" || tone === "image" ? "bg-orange-400" : "bg-blue-600";
  const button = (key?: number) => <div key={key} style={{ width: "5em", height: "1.5em" }} className={`rounded-md ${accent}`} />;
  switch (c) {
    case "T": return <div style={{ width: "70%", height: "0.9em" }} className={`rounded-full ${ink}`} />;
    case "t": return line("45%", dark);
    case "p": return <div className="flex w-full flex-col gap-[0.4em]">{line("100%", dark)}{line("92%", dark)}{line("96%", dark)}{line("60%", dark)}</div>;
    case "i": return <div style={{ aspectRatio: "16 / 10" }} className={`w-full rounded-md ${box}`} />;
    case "I": return <div style={{ aspectRatio: "16 / 7" }} className={`w-full rounded-md ${box}`} />;
    case "b": return button();
    case "bb": return <div className="flex gap-[0.5em]">{button(1)}<div style={{ width: "5em", height: "1.5em" }} className={`rounded-md border-2 ${dark ? "border-white/70" : "border-slate-400"}`} /></div>;
    case "c": return (
      <div className={`flex w-full flex-col gap-[0.5em] rounded-md border p-[0.5em] ${dark ? "border-white/30" : "border-slate-200 bg-white"}`}>
        <div style={{ aspectRatio: "16 / 9" }} className={`w-full rounded ${box}`} />
        {line("70%", dark, 0.6)}{line("90%", dark)}
      </div>
    );
    case "k": return (
      <div className={`flex w-full flex-col items-start gap-[0.5em] rounded-md border p-[0.7em] ${dark ? "border-white/30" : "border-slate-200 bg-white"}`}>
        <div style={{ width: "1.8em", height: "1.8em" }} className={`rounded-full ${tone === "dark" ? "bg-orange-400" : "bg-blue-200"}`} />
        {line("65%", dark, 0.6)}{line("90%", dark)}
      </div>
    );
    case "q": return (
      <div className={`flex w-full flex-col gap-[0.5em] rounded-md border-l-4 p-[0.7em] ${dark ? "border-orange-400 bg-white/10" : "border-blue-500 bg-blue-50"}`}>
        {line("95%", dark, 0.55)}{line("80%", dark, 0.55)}{line("30%", dark)}
      </div>
    );
    case "s": return <div className="flex w-full flex-col items-center gap-[0.4em]"><div style={{ width: "60%", height: "1.2em" }} className={`rounded-md ${dark ? "bg-orange-400" : "bg-blue-600"}`} />{line("50%", dark)}</div>;
    case "r": return <div className={`flex w-full items-center gap-[0.6em] rounded border px-[0.6em] py-[0.5em] ${dark ? "border-white/30" : "border-slate-200 bg-white"}`}>{line("35%", dark, 0.5)}<div className="flex-1" />{line("15%", dark, 0.5)}</div>;
    case "f": return <div style={{ height: "1.6em" }} className={`w-full rounded-md border ${dark ? "border-white/40 bg-white/10" : "border-slate-300 bg-white"}`} />;
    case "a": return <div style={{ height: "1.6em" }} className={`flex w-full items-center justify-center rounded-md ${accent}`}><div style={{ width: "40%", height: "0.4em" }} className="rounded-full bg-white/80" /></div>;
    case "x": return (
      <div className="flex w-full flex-col gap-[0.5em]">
        {[88, 70, 80, 60].map((w) => (
          <div key={w} className="flex items-center gap-[0.5em]"><div style={{ width: "0.8em", height: "0.8em" }} className={`shrink-0 rounded-full ${dark ? "bg-orange-400" : "bg-green-500"}`} />{line(`${w}%`, dark)}</div>
        ))}
      </div>
    );
    case "n": return (
      <div className={`flex w-full flex-col items-center gap-[0.5em] rounded-md border p-[0.8em] ${dark ? "border-white/30" : "border-slate-200 bg-white"}`}>
        {line("40%", dark, 0.6)}<div style={{ width: "50%", height: "1.3em" }} className={`rounded-md ${dark ? "bg-orange-400" : "bg-blue-600"}`} />{line("80%", dark)}{line("70%", dark)}{line("75%", dark)}{button()}
      </div>
    );
    case "g": return <div style={{ aspectRatio: "4 / 3" }} className={`w-full rounded ${box}`} />;
    case "d": return <div className="flex justify-center gap-[0.4em]">{[0, 1, 2].map((i) => <div key={i} style={{ width: "0.6em", height: "0.6em" }} className={`rounded-full ${i === 0 ? (dark ? "bg-white" : "bg-blue-600") : box}`} />)}</div>;
  }
}

export function WireView({ wire, device, fontSize, rtl }: { wire: Wire; device: Device; fontSize: number; rtl?: boolean }) {
  const dark = wire.tone === "dark" || wire.tone === "image";
  const bg = wire.tone === "dark" ? "bg-slate-900" : wire.tone === "image" ? "bg-gradient-to-br from-slate-700 to-slate-900" : "bg-white";
  return (
    <div dir={rtl ? "rtl" : "ltr"} style={{ fontSize }} className={`flex w-full flex-col gap-[0.9em] p-[1em] ${bg}`}>
      {wire.rows.map((r, i) => {
        const stacked = device === "mobile";
        // On a tablet a row of 4 wraps into two lines; on a phone every row is one column.
        const wrap = device === "tablet" && r.length > 3;
        return (
          <div
            key={i}
            className={`flex gap-[0.9em] ${stacked ? "flex-col" : wrap ? "flex-wrap" : "flex-row"} ${wire.center ? (stacked ? "items-center" : "items-center justify-center") : "items-stretch"}`}
          >
            {r.map((c, j) => (
              <div key={j} style={wrap ? { flexBasis: "46%" } : undefined} className={`flex min-w-0 flex-col gap-[0.5em] ${stacked ? "w-full" : "flex-1"} ${wire.center ? "items-center" : "justify-center"}`}>
                <Cell c={c} dark={dark} tone={wire.tone} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Thumb({ entry, device }: { entry: LibraryEntry; device: Device }) {
  return (
    <div className="pointer-events-none flex h-36 items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50" aria-hidden>
      <div className="mx-auto" style={{ width: device === "mobile" ? "45%" : device === "tablet" ? "75%" : "100%" }}>
        <WireView wire={entry.wire} device={device} fontSize={device === "mobile" ? 8 : 9} />
      </div>
    </div>
  );
}

export function BlockLibrary({ open, onClose, onAdd, onAddGlobal }: { open: boolean; onClose: () => void; onAdd: (entry: LibraryEntry) => void; onAddGlobal: (g: GlobalBlockRow, mode: "linked" | "copy") => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<View>("all");
  const [recent, setRecent] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [globals, setGlobals] = useState<GlobalBlockRow[] | "error" | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [rtl, setRtl] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // Read after open so the server and first client render agree.
    Promise.resolve().then(() => {
      setRecent(readIds(RECENT_KEY));
      setFavorites(readIds(FAVORITE_KEY));
    });
    listGlobalBlocks().then(setGlobals).catch(() => setGlobals("error"));
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const pool = searchLibrary(query, category === "all" || category === "recent" || category === "favorites" || category === "recommended" || category === "global" ? "all" : category);
    const ids = category === "recent" ? recent : category === "favorites" ? favorites : category === "recommended" ? RECOMMENDED : null;
    if (!ids) return pool;
    // Keep the saved order (most recent first).
    return ids.map((id) => pool.find((e) => e.id === id)).filter((e): e is LibraryEntry => !!e);
  }, [query, category, recent, favorites]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: LIBRARY.length, recent: recent.length, favorites: favorites.length, recommended: RECOMMENDED.filter((id) => LIBRARY.some((e) => e.id === id)).length };
    for (const e of LIBRARY) c[e.category] = (c[e.category] ?? 0) + 1;
    return c;
  }, [recent, favorites]);
  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((x) => x !== id) : [id, ...favorites];
    setFavorites(next);
    writeIds(FAVORITE_KEY, next);
  };
  const preview = previewId ? LIBRARY.find((e) => e.id === previewId) ?? null : null;
  if (!open) return null;

  const add = (e: LibraryEntry) => {
    const nextRecent = [e.id, ...recent.filter((x) => x !== e.id)].slice(0, 8);
    setRecent(nextRecent);
    writeIds(RECENT_KEY, nextRecent);
    setPreviewId(null);
    onAdd(e);
  };
  const frame = DEVICES.find((d) => d.id === device)!;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/50 p-0 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Add a block" className="flex w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="mr-auto text-base font-semibold text-slate-900">Add a block</h2>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search blocks…" aria-label="Search blocks" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400" />
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Preview device">
            {DEVICES.map((d) => (
              <button key={d.id} type="button" onClick={() => setDevice(d.id)} aria-pressed={device === d.id} title={d.label} className={`flex h-8 w-8 items-center justify-center rounded-md ${device === d.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>
                <d.Icon size={16} aria-hidden />
                <span className="sr-only">{d.label}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setRtl((v) => !v)} aria-pressed={rtl} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${rtl ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`} title="Preview right-to-left (Arabic)">
            {rtl ? "عربي RTL" : "English LTR"}
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav aria-label="Block categories" className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 p-2 md:w-56 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3">
            {([{ id: "all", label: "All blocks" }, { id: "recommended", label: "Recommended" }, { id: "recent", label: "Recently used" }, { id: "favorites", label: "Favorites" }, { id: "global", label: "Global blocks" }, ...LIBRARY_CATEGORIES] as { id: View; label: string }[]).map((c) => (
              <button key={c.id} type="button" onClick={() => setCategory(c.id)} aria-pressed={category === c.id} className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${category === c.id ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
                <span>{c.label}</span>
                <span className="rounded-full bg-slate-100 px-2 text-[11px] text-slate-500">{c.id === "global" ? (Array.isArray(globals) ? globals.length : "–") : counts[c.id] ?? 0}</span>
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {category === "global" ? (
              <section>
                <h3 className="text-sm font-semibold text-slate-900">Global blocks</h3>
                <p className="mb-3 text-xs text-slate-500">Reusable blocks shared by many pages. “Add linked” follows later edits to the global block; “Add copy” is this page&apos;s own copy.</p>
                {globals === null && <p className="py-10 text-center text-sm text-slate-400">Loading…</p>}
                {globals === "error" && <p className="py-10 text-center text-sm text-slate-400">Global blocks are not available yet (the database update has not been applied).</p>}
                {Array.isArray(globals) && globals.filter((g) => `${g.name} ${g.typeLabel}`.toLowerCase().includes(query.trim().toLowerCase())).length === 0 && (
                  <p className="py-10 text-center text-sm text-slate-400">{globals.length === 0 ? "No global blocks yet. Open a block on a page and choose “Save as global block”." : `No global block matches “${query}”.`}</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.isArray(globals) && globals.filter((g) => `${g.name} ${g.typeLabel}`.toLowerCase().includes(query.trim().toLowerCase())).map((g) => {
                    const entry = LIBRARY.find((e) => e.type === g.type);
                    return (
                      <div key={g.id} className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
                        {entry && <Thumb entry={entry} device={device} />}
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><LibraryIcon name={entry?.icon ?? "Link"} size={17} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900">{g.name}</p>
                            <p className="text-xs text-slate-500">{g.typeLabel} · used on {g.usedOn.length} page{g.usedOn.length === 1 ? "" : "s"}</p>
                          </div>
                        </div>
                        <div className="mt-auto flex gap-2">
                          <button type="button" onClick={() => onAddGlobal(g, "copy")} className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Add copy</button>
                          <button type="button" onClick={() => onAddGlobal(g, "linked")} className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Add linked</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : results.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-400">
                {query ? `No block matches “${query}”.` : category === "recent" ? "Blocks you add will show up here." : category === "favorites" ? "Tap the star on a block to keep it here." : "Nothing here yet."}
              </p>
            ) : (
              (category === "all" ? LIBRARY_CATEGORIES : category === "recent" || category === "favorites" || category === "recommended" ? [{ id: category, label: { recent: "Recently used", favorites: "Favorites", recommended: "Recommended" }[category], hint: category === "recommended" ? "A good starting set for a landing page" : "" }] : LIBRARY_CATEGORIES.filter((c) => c.id === category)).map((cat) => {
                const items = cat.id === "recent" || cat.id === "favorites" || cat.id === "recommended" ? results : results.filter((e) => e.category === cat.id);
                if (items.length === 0) return null;
                return (
                  <section key={cat.id} className="mb-7 last:mb-0">
                    <h3 className="text-sm font-semibold text-slate-900">{cat.label}</h3>
                    <p className="mb-3 text-xs text-slate-500">{cat.hint}</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((e) => (
                        <div key={e.id} className={`flex flex-col gap-2.5 rounded-xl border bg-white p-3 transition-colors hover:border-blue-300 ${previewId === e.id ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}>
                          <button type="button" onClick={() => setPreviewId(e.id)} aria-label={`Preview ${e.name}`} className="text-left">
                            <Thumb entry={e} device={device} />
                          </button>
                          <div className="flex items-start gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <LibraryIcon name={e.icon} size={17} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">{e.name}</p>
                              <p className="text-xs leading-snug text-slate-500">{e.description}</p>
                            </div>
                            <button type="button" onClick={() => toggleFavorite(e.id)} aria-pressed={favorites.includes(e.id)} aria-label={favorites.includes(e.id) ? `Remove ${e.name} from favorites` : `Add ${e.name} to favorites`} className="shrink-0 text-slate-300 hover:text-amber-500">
                              <Star size={16} className={favorites.includes(e.id) ? "fill-amber-400 text-amber-400" : ""} aria-hidden />
                            </button>
                          </div>
                          <div className="mt-auto flex gap-2">
                            <button type="button" onClick={() => setPreviewId(e.id)} className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                              Preview
                            </button>
                            <button type="button" onClick={() => add(e)} className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                              Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>

          {preview && (
            <aside aria-label={`Preview of ${preview.name}`} className="flex max-h-[55vh] shrink-0 flex-col gap-3 overflow-y-auto border-t border-slate-200 bg-slate-50 p-4 md:max-h-none md:w-96 md:border-l md:border-t-0">
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <LibraryIcon name={preview.icon} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{preview.name}</p>
                  <p className="text-xs text-slate-500">{preview.description}</p>
                </div>
                <button type="button" onClick={() => setPreviewId(null)} aria-label="Close preview" className="text-slate-400 hover:text-slate-700">
                  <X size={16} aria-hidden />
                </button>
              </div>
              <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-100 p-3">
                <div style={{ width: frame.width }} className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm" aria-hidden>
                  <WireView wire={preview.wire} device={device} fontSize={device === "mobile" ? 8 : 11} rtl={rtl} />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">A layout sketch: {frame.label.toLowerCase()} view{rtl ? ", right-to-left" : ""}. After adding, edit the real content and use the page preview to see it with your colours and pictures.</p>
              <button type="button" onClick={() => add(preview)} className="rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                Add “{preview.name}”
              </button>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
