"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Monitor, Smartphone, Star } from "lucide-react";
import { inputClassName } from "@/components/FormField";
import { FieldEditor } from "@/components/cms/BlockForm";
import { BLOCK_REGISTRY, type FieldDef } from "@/lib/cms/blocks";
import { listCatalogueChoices, type CatalogueChoice } from "@/app/admin/website/catalogue-choices-actions";

type Bi = { en?: string; ar?: string };
type Props = Record<string, unknown>;

const TABS: { id: string; label: string; keys: string[] }[] = [
  { id: "content", label: "Content", keys: ["kind", "source", "imageUrl", "imageAlt", "gallery", "name", "subtitle", "description"] },
  { id: "price", label: "Price & features", keys: ["price", "oldPrice", "currency", "startingFrom", "priceLabel", "priceUnit", "showDiscount", "priceColor", "featuresHeading", "features", "badge", "rating", "reviews"] },
  { id: "buttons", label: "Buttons", keys: ["primary", "secondaryType", "secondaryLabel", "secondaryUrl", "buttonStyle"] },
  { id: "look", label: "Look", keys: ["imagePosition", "layout", "bgColor", "textColor", "shadow", "radius"] },
];

const BADGE_LABEL: Record<string, { en: string; ar: string }> = {
  featured: { en: "Featured", ar: "مميز" }, popular: { en: "Popular", ar: "الأكثر طلباً" }, bestSeller: { en: "Best seller", ar: "الأكثر مبيعاً" }, new: { en: "New", ar: "جديد" }, offer: { en: "Special offer", ar: "عرض خاص" }, limited: { en: "Limited time", ar: "لفترة محدودة" },
};

const plain = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\[([^\]]*)\]\([^)]*\)(\{[^}]*\})?/g, "$1").replace(/\s+/g, " ").trim();

function Preview({ value, device, lang }: { value: Props; device: "desktop" | "mobile"; lang: "en" | "ar" }) {
  const t = (b: unknown) => ((b as Bi | undefined)?.[lang] || (b as Bi | undefined)?.[lang === "en" ? "ar" : "en"] || "").toString();
  const mobile = device === "mobile";
  const features = ((value.features as { text: Bi; icon?: string }[]) ?? []).filter((f) => t(f.text));
  const badge = BADGE_LABEL[String(value.badge)];
  const price = String(value.price ?? "").trim();
  const old = String(value.oldPrice ?? "").trim();
  const cur = String(value.currency ?? "AED");
  const rating = Number(value.rating ?? 0);
  const reviews = Number(value.reviews ?? 0);
  const primary = value.primary as { label: Bi; url: string } | undefined;
  const sec = String(value.secondaryType ?? "none");
  const defaults: Record<string, [string, string]> = { call: ["Call now", "اتصل الآن"], whatsapp: ["WhatsApp", "واتساب"], quote: ["Request a quote", "اطلب عرض سعر"], learn: ["Learn more", "اعرف المزيد"], buy: ["Buy now", "اشترِ الآن"], custom: ["Button", "زر"] };
  const secLabel = sec === "call" || sec === "whatsapp" ? defaults[sec][lang === "en" ? 0 : 1] : t(value.secondaryLabel) || (defaults[sec]?.[lang === "en" ? 0 : 1] ?? "");
  const note = [t(value.priceLabel) || (value.startingFrom === "yes" ? (lang === "en" ? "Starting price" : "السعر يبدأ من") : ""), t(value.priceUnit)].filter(Boolean).join(" · ");
  const numeric = (v: string) => Number(v.replace(/,/g, ""));
  const off = value.showDiscount === "yes" && numeric(price) > 0 && numeric(old) > numeric(price) ? Math.round((1 - numeric(price) / numeric(old)) * 100) : null;
  const priceInk = typeof value.priceColor === "string" && value.priceColor ? value.priceColor : undefined;
  const more = ((value.gallery as { imageUrl?: string }[]) ?? []).filter((g) => g.imageUrl).length;
  const position = String(value.imagePosition ?? "end");
  const stacked = mobile || position === "top" || value.layout === "card";
  const bg = typeof value.bgColor === "string" && value.bgColor ? value.bgColor : "#ffffff";
  const ink = typeof value.textColor === "string" && value.textColor ? value.textColor : "#0f172a";
  const image = typeof value.imageUrl === "string" ? value.imageUrl : "";

  const picture = (
    <div className="flex flex-col gap-1.5">
      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">{lang === "en" ? "No picture yet" : "لا توجد صورة بعد"}</div>}
      </div>
      {more > 0 && <p className="text-[11px] opacity-60" style={{ color: ink }}>{lang === "en" ? `+${more} more picture${more > 1 ? "s" : ""} (thumbnails)` : `+${more} صور إضافية`}</p>}
    </div>
  );
  const text = (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {badge && <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">{badge[lang]}</span>}
        {off !== null && <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">{`-${off}%`}</span>}
        {rating > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: ink }}>
            <Star size={13} className="fill-amber-400 text-amber-400" aria-hidden />
            {rating.toFixed(1)}
            {reviews > 0 && <span className="opacity-60">({reviews})</span>}
          </span>
        )}
      </div>
      <div>
        <h4 className="text-lg font-bold leading-tight" style={{ color: ink }}>{t(value.name) || (lang === "en" ? "Name" : "الاسم")}</h4>
        {t(value.subtitle) && <p className="mt-0.5 text-sm opacity-70" style={{ color: ink }}>{t(value.subtitle)}</p>}
      </div>
      {price && (
        <div style={{ color: priceInk ?? ink }}>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{cur} {price}</span>
            {old && <span className="text-sm line-through opacity-50">{cur} {old}</span>}
          </div>
          {note && <p className="mt-0.5 text-xs opacity-70">{note}</p>}
        </div>
      )}
      {plain(t(value.description)) && <p className="line-clamp-3 text-sm opacity-80" style={{ color: ink }}>{plain(t(value.description))}</p>}
      {features.length > 0 && t(value.featuresHeading) && <h5 className="border-t border-slate-200 pt-3 text-sm font-bold" style={{ color: ink }}>{t(value.featuresHeading)}</h5>}
      {features.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: ink }}>
              <Check size={15} className="mt-0.5 shrink-0 text-green-600" aria-hidden />
              {t(f.text)}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <span className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${value.buttonStyle === "dark" ? "bg-slate-900" : "bg-blue-600"}`}>{t(primary?.label) || (lang === "en" ? "Book now" : "احجز الآن")}</span>
        {sec !== "none" && secLabel && <span className={`rounded-lg border px-4 py-2 text-sm font-semibold ${value.buttonStyle === "dark" ? "border-emerald-500 text-emerald-600" : ""}`} style={value.buttonStyle === "dark" ? undefined : { color: ink, borderColor: ink }}>{secLabel}</span>}
      </div>
    </div>
  );
  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className={`rounded-2xl border border-slate-200 p-4 ${stacked ? "flex flex-col gap-4" : "flex items-center gap-6"}`} style={{ background: bg }}>
      {stacked ? (
        <>{picture}{text}</>
      ) : position === "start" ? (
        <><div className="w-2/5 shrink-0">{picture}</div>{text}</>
      ) : (
        <>{text}<div className="w-2/5 shrink-0">{picture}</div></>
      )}
    </div>
  );
}

function CataloguePicker({ value, onPick }: { value: string; onPick: (c: CatalogueChoice | null) => void }) {
  const [choices, setChoices] = useState<CatalogueChoice[] | null>(null);
  useEffect(() => {
    void listCatalogueChoices().then(setChoices).catch(() => setChoices([]));
  }, []);
  const known = choices?.some((c) => c.key === value);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">Service from the Service Catalogue</span>
      <select className={inputClassName} value={value} onChange={(e) => onPick(choices?.find((c) => c.key === e.target.value) ?? null)}>
        <option value="">{choices === null ? "Loading…" : "Choose a service"}</option>
        {choices?.map((c) => (
          <option key={c.key} value={c.key}>{c.category} — {c.nameEn}{c.bookable ? "" : " (no booking)"}</option>
        ))}
        {value && choices && !known && <option value={value}>{value} (no longer in the catalogue)</option>}
      </select>
      <span className="text-[11px] text-slate-400">The name and the Book / page links come from the catalogue and stay up to date. Anything you type in the other tabs replaces the catalogue&apos;s text.</span>
    </label>
  );
}

// The dedicated editor for the product / service showcase: four tabs of fields (the same registry fields the generic form
// would show, just grouped), the catalogue picker, and a live desktop / mobile preview in English or Arabic.
export function ShowcaseEditor({ value, onChange }: { value: Props; onChange: (v: Props) => void }) {
  const [tab, setTab] = useState("content");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [lang, setLang] = useState<"en" | "ar">("en");
  const all = BLOCK_REGISTRY.showcase.fields;
  const fields = useMemo(() => {
    const keys = TABS.find((t) => t.id === tab)!.keys;
    return all.filter((f) => keys.includes(f.key) && f.key !== "catalogueKey") as FieldDef[];
  }, [all, tab]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Showcase sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${tab === t.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === "content" && value.source === "catalogue" && (
          <CataloguePicker
            value={String(value.catalogueKey ?? "")}
            onPick={(c) => onChange({ ...value, catalogueKey: c?.key ?? "", ...(c && !((value.name as Bi)?.en || (value.name as Bi)?.ar) ? { name: { en: c.nameEn, ar: c.nameAr } } : {}) })}
          />
        )}
        <FieldEditor fields={fields} value={value} onChange={onChange} />
      </div>
      <div className="min-w-0">
        <div className="sticky top-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="mr-auto text-xs font-semibold text-slate-500">Preview</span>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Preview device">
              {([["desktop", Monitor, "Desktop"], ["mobile", Smartphone, "Mobile"]] as const).map(([id, Icon, label]) => (
                <button key={id} type="button" onClick={() => setDevice(id)} aria-pressed={device === id} title={label} className={`flex h-7 w-7 items-center justify-center rounded-md ${device === id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>
                  <Icon size={14} aria-hidden />
                  <span className="sr-only">{label}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setLang(lang === "en" ? "ar" : "en")} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600">
              {lang === "en" ? "English" : "العربية"}
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mx-auto" style={{ maxWidth: device === "mobile" ? 300 : undefined }}>
              <Preview value={value} device={device} lang={lang} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
