"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Menu as MenuIcon, Monitor, Smartphone } from "lucide-react";
import { linkState, pathTo, type KnownLinks, type MenuNode } from "@/lib/site/menuModel";
import { AREAS_MENU_URL, SERVICES_MENU_URL, isAutoUrl } from "@/lib/site/siteRules";

export type AutoLeaf = { labelEn: string; labelAr: string; url: string };
export type PreviewData = {
  areas: AutoLeaf[];
  services: AutoLeaf[];
  // Pages the website adds to the header by itself (Page settings > "Show in the navigation bar").
  extraHeader: AutoLeaf[];
  cta: { en: string; ar: string };
};

type PNode = { uid: string; labelEn: string; labelAr: string; button: boolean; badgeEn: string; badgeAr: string; automatic?: boolean; children: PNode[] };

const asLeaf = (a: AutoLeaf, uid: string): PNode => ({ uid, labelEn: a.labelEn, labelAr: a.labelAr, button: false, badgeEn: "", badgeAr: "", automatic: true, children: [] });

// What a visitor gets from this menu on this kind of screen: hidden items and unpublished pages removed, auto lists filled in.
export function visibleNodes(nodes: MenuNode[], screen: "desktop" | "mobile", data: PreviewData, known: KnownLinks, menu: string): PNode[] {
  const footer = menu === "footer" || menu === "services" || menu === "locations";
  const out: PNode[] = [];
  for (const n of nodes) {
    if (!n.visible || (screen === "desktop" ? !n.showDesktop : !n.showMobile)) continue;
    if (linkState(n.url, known) === "draft") continue;
    const auto = isAutoUrl(n.url) ? (n.url === AREAS_MENU_URL ? data.areas : data.services).map((a, i) => asLeaf(a, `${n.uid}-auto${i}`)) : [];
    if (footer && isAutoUrl(n.url)) {
      if (n.url === SERVICES_MENU_URL || menu === "locations") out.push(...auto);
      continue;
    }
    const children = [...auto, ...visibleNodes(n.children, screen, data, known, menu)];
    if (!n.url && !children.length) continue;
    out.push({ uid: n.uid, labelEn: n.labelEn, labelAr: n.labelAr, button: n.style === "button", badgeEn: n.badgeEn, badgeAr: n.badgeAr, children });
  }
  return out;
}

function Badge({ text }: { text: string }) {
  return text ? <span className="ms-1.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-white">{text}</span> : null;
}

export function MenuPreview({ menu, nodes, selected, data, known, onSelect }: { menu: string; nodes: MenuNode[]; selected: string | null; data: PreviewData; known: KnownLinks; onSelect: (uid: string) => void }) {
  const [screen, setScreen] = useState<"desktop" | "mobile">(menu === "mobile" ? "mobile" : "desktop");
  const [lang, setLang] = useState<"en" | "ar">("en");
  const ar = lang === "ar";
  const open = selected ? pathTo(nodes, selected) : [];
  const shown = visibleNodes(nodes, screen, data, known, menu);
  const extra = menu === "header" || (menu === "mobile" && !nodes.length) ? data.extraHeader.map((a, i) => asLeaf(a, `extra${i}`)) : [];
  const all = [...shown, ...extra];
  const label = (n: PNode) => (ar ? n.labelAr || n.labelEn : n.labelEn || n.labelAr) || "Untitled";
  const badge = (n: PNode) => (ar ? n.badgeAr : n.badgeEn);
  const footer = menu === "footer" || menu === "services" || menu === "locations";

  // The dropdown that is open: the one holding the selected item, otherwise the first one with sub-items.
  const openTop = all.find((n) => open.includes(n.uid) && n.children.length) ?? all.find((n) => n.children.length) ?? null;
  const openSub = openTop?.children.find((c) => open.includes(c.uid) && c.children.length) ?? null;
  // Same rule as the website: a dropdown with more than 10 items is laid out in four columns.
  const wide = (openTop?.children.length ?? 0) > 10;

  const row = (n: PNode, active: boolean, extraClass = "") => (
    <button key={n.uid} type="button" disabled={n.automatic} onClick={() => onSelect(n.uid)} title={n.automatic ? "Added automatically" : undefined}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-start text-xs ${active ? "bg-white/10 font-semibold text-sky-300" : "text-slate-300 hover:bg-white/5"} ${extraClass}`}>
      <span className="flex items-center">{label(n)}<Badge text={badge(n)} /></span>
      {n.children.length > 0 && <ChevronRight size={12} className={ar ? "rotate-180" : ""} />}
    </button>
  );

  const toggle = (active: boolean) => `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <section aria-label="Live preview" className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">Live preview <span className="font-normal text-slate-400">· includes changes you have not published yet</span></h3>
        <div className="flex gap-1">
          <button type="button" aria-pressed={screen === "desktop"} onClick={() => setScreen("desktop")} className={toggle(screen === "desktop")}><Monitor size={14} /> Desktop</button>
          <button type="button" aria-pressed={screen === "mobile"} onClick={() => setScreen("mobile")} className={toggle(screen === "mobile")}><Smartphone size={14} /> Mobile</button>
          <button type="button" onClick={() => setLang(ar ? "en" : "ar")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">{ar ? "English" : "العربية"}</button>
        </div>
      </div>

      <div data-testid="menu-preview" data-screen={screen} dir={ar ? "rtl" : "ltr"} className="overflow-x-auto">
        {footer ? (
          <div className="rounded-xl bg-[#0b1430] p-4">
            <p className="mb-2 text-xs font-bold text-white">{menu === "footer" ? (ar ? "روابط سريعة" : "Quick Links") : menu === "services" ? (ar ? "الخدمات" : "Services") : ar ? "المواقع" : "Locations"}</p>
            <div className={screen === "mobile" ? "flex max-w-[300px] flex-col" : "grid grid-cols-3 gap-x-4"}>{all.length ? all.map((n) => row(n, selected === n.uid)) : <p className="text-xs text-slate-400">Nothing to show: the site uses its built-in links.</p>}</div>
          </div>
        ) : screen === "desktop" ? (
          <div className="min-w-[620px] pb-1">
            <div className="flex items-center gap-4 rounded-xl bg-[#0b1430] px-4 py-3">
              <span className="text-sm font-extrabold tracking-wide text-white">OS<span className="text-sky-400">TA</span></span>
              <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
                {all.map((n) => (
                  <button key={n.uid} type="button" disabled={n.automatic} onClick={() => onSelect(n.uid)}
                    className={n.button ? "flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white" : `flex items-center gap-1 whitespace-nowrap border-b-2 py-0.5 text-xs ${open.includes(n.uid) || openTop?.uid === n.uid ? "border-sky-400 font-semibold text-white" : "border-transparent text-slate-300"}`}>
                    {label(n)}<Badge text={badge(n)} />{n.children.length > 0 && <ChevronDown size={11} />}
                  </button>
                ))}
              </div>
              {(ar ? data.cta.ar : data.cta.en) && <span className="whitespace-nowrap rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">{ar ? data.cta.ar : data.cta.en}</span>}
            </div>
            {openTop && (
              <div className={`mt-1 flex items-start gap-1 px-4 ${wide ? "flex-col" : ""}`}>
                <div data-testid="preview-dropdown" className={`max-h-56 overflow-y-auto rounded-xl bg-[#111c3d] p-1.5 shadow-lg ${wide ? "w-full" : "w-56"}`}>
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase text-slate-500">{label(openTop)}</p>
                  <div className={wide ? "grid gap-x-1" : undefined} style={wide ? { gridAutoFlow: "column", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gridTemplateRows: `repeat(${Math.ceil(openTop.children.length / 4)}, auto)` } : undefined}>
                    {openTop.children.map((c) => row(c, open.includes(c.uid)))}
                  </div>
                </div>
                {openSub && <div data-testid="preview-flyout" className="max-h-56 w-56 overflow-y-auto rounded-xl bg-[#111c3d] p-1.5 shadow-lg">{openSub.children.map((c) => row(c, open.includes(c.uid)))}</div>}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-[320px] rounded-2xl bg-[#0b1430] p-3">
            <div className="mb-2 flex items-center justify-between"><span className="text-sm font-extrabold text-white">OS<span className="text-sky-400">TA</span></span><MenuIcon size={18} className="text-white" /></div>
            <div className="max-h-72 overflow-y-auto border-t border-white/10 pt-1">
              {all.map((n) => (
                <div key={n.uid}>
                  {n.button ? <button type="button" onClick={() => onSelect(n.uid)} className="mt-1 w-full rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">{label(n)}<Badge text={badge(n)} /></button> : row(n, selected === n.uid)}
                  {open.includes(n.uid) && n.children.map((c) => (
                    <div key={c.uid} className="ps-4">
                      {row(c, open.includes(c.uid))}
                      {open.includes(c.uid) && c.children.map((g) => <div key={g.uid} className="ps-4">{row(g, selected === g.uid)}</div>)}
                    </div>
                  ))}
                </div>
              ))}
              {!all.length && <p className="p-2 text-xs text-slate-400">Nothing to show on phones.</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
