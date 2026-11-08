import type { Lang } from "@/lib/maintenance/builder";
import { COMPANY } from "@/lib/contracts/clauses";
import { CONTRACT_LOGO_JPEG } from "@/lib/contracts/assets.generated";
import { PDF_CSS, esc, fmtDate, fmtMoney, ltr, pageCss } from "@/lib/contracts/html";
import { MODE_LABEL, UNIT_LABEL, type Bi } from "./config";
import type { DuctCustomer, DuctProject, DuctSnapshot } from "./snapshot";

// The ductwork quotation as a printable A4 page: English, Arabic (right-to-left), or BOTH in one PDF (the English pages, then the Arabic
// pages). Pure: the same record always gives the same page.

export type PdfLang = "en" | "ar" | "both";
export type DuctDocInput = {
  snapshot: DuctSnapshot; number: string; version: number; createdAt: Date; expiresAt: Date;
  customer: DuctCustomer; project: DuctProject; projectTypeLabel: Bi; emirateLabel: Bi;
};

const EXTRA_CSS = `
.qmark{display:inline-block;margin-top:5pt;padding:3pt 10pt;border-radius:4pt;font-weight:700;font-size:8.5pt;background:#fef3c7;color:#92400e;border:1pt solid #f59e0b}
.items th.num,.items td.num{text-align:end}.items td.sub{color:#475569;font-size:8.5pt}
.rfq{color:#b45309;font-weight:700}.sumtable{width:62%;margin-inline-start:auto}.sumtable td{border:.6pt solid #cbd5e1}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:8pt}.review{color:#b45309}.part{break-before:page}
`;

const qty = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

function body(d: DuctDocInput, lang: Lang, first: boolean): string {
  const s = d.snapshot;
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const pickBi = (b: Bi) => (lang === "ar" ? b.ar || b.en : b.en);
  const money = (n: number | null) => (n == null ? t("Request for quotation", "بعرض سعر") : fmtMoney(n, "AED", lang));
  const label = (l: { labelEn: string; labelAr: string }) => (lang === "ar" ? l.labelAr || l.labelEn : l.labelEn);
  const detail = (l: { detailEn: string; detailAr: string }) => (lang === "ar" ? l.detailAr || l.detailEn : l.detailEn);
  const unit = (u: keyof typeof UNIT_LABEL) => UNIT_LABEL[u][lang];
  const T = s.totals;
  const kv = (rows: [string, string][]) => `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join("")}</table>`;
  const list = (items: string[]) => (items.length ? `<ul style="padding-inline-start:14pt">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<span class="muted">—</span>`);
  const pick = (b: { en: string[]; ar: string[] }) => (lang === "ar" && b.ar.length ? b.ar : b.en);
  const L = lang === "ar" ? ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"] : ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const c = d.customer, p = d.project;
  const system = (key: string | null) => { const x = s.systems.find((y) => y.key === key); return x ? (lang === "ar" ? x.shortAr || x.nameAr : x.shortEn || x.nameEn) : "—"; };
  const num = (v: string) => `<td class="num">${v}</td>`;
  const rate = (l: { unitPrice: number | null }) => (l.unitPrice == null ? `<span class="rfq">${esc(money(null))}</span>` : esc(money(l.unitPrice)));
  const amt = (l: { amount: number | null }) => (l.amount == null ? `<span class="rfq">${esc(money(null))}</span>` : esc(money(l.amount)));

  const duct = s.lines.filter((l) => l.kind === "duct");
  const ductRows = duct.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(label(l))}${detail(l) ? `<div class="sub">${esc(detail(l))}</div>` : ""}</td><td>${esc(system(l.system))}</td>${num(qty(l.qty))}<td>${esc(unit(l.unit))}</td>${num(rate(l))}${num(amt(l))}</tr>`).join("");
  const secRows = s.sections.map((x, i) => {
    const dims = x.method === "area" ? `${t("Total area from BOQ / drawings", "إجمالي المساحة من جدول الكميات / المخططات")}${x.sections ? ` (${x.sections} ${t("sections", "أقسام")})` : ""}`
      : x.method === "rect" ? `${t("Rectangular", "مستطيل")}: ${x.widthMm} × ${x.heightMm} mm × ${x.lengthM} m × ${x.qty}` : `${t("Circular", "دائري")}: Ø ${x.diameterMm} mm × ${x.lengthM} m × ${x.qty}`;
    return `<tr><td>${i + 1}</td><td>${esc(system(x.system))}<div class="sub">${esc(MODE_LABEL[x.mode][lang])}</div></td><td>${ltr(dims)}${x.description ? `<div class="sub">${esc(x.description)}</div>` : ""}</td>${num(qty(x.areaM2))}</tr>`;
  }).join("");
  const areaRows = T.areas.map((a) => `<tr><td>${esc(lang === "ar" ? a.nameAr : a.nameEn)} – ${esc(MODE_LABEL[a.mode][lang])}</td>${num(ltr(`${qty(a.area)} m²`))}</tr>`).join("");
  const simpleTable = (kind: "accessory" | "service") => {
    const rows = s.lines.filter((l) => l.kind === kind || (kind === "service" && l.kind === "custom"));
    if (!rows.length) return `<p class="muted">${esc(kind === "accessory" ? t("No accessories or components were selected.", "لم يتم اختيار إكسسوارات أو مكونات.") : t("No additional services were selected.", "لم يتم اختيار خدمات إضافية."))}</p>`;
    return `<table class="items long"><tr><th>#</th><th>${esc(kind === "accessory" ? t("Component", "المكون") : t("Service", "الخدمة"))}</th><th class="num">${esc(t("Qty", "الكمية"))}</th><th>${esc(t("Unit", "الوحدة"))}</th><th class="num">${esc(t("Unit price", "سعر الوحدة"))}</th><th class="num">${esc(t("Total", "الإجمالي"))}</th></tr>${rows.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(label(l))}${detail(l) ? `<div class="sub">${esc(detail(l))}</div>` : ""}</td>${num(qty(l.qty))}<td>${esc(unit(l.unit))}</td>${num(rate(l))}${num(amt(l))}</tr>`).join("")}</table>`;
  };
  const rfqNote = T.rfq ? `<p class="note" style="margin-top:6pt"><b>${esc(t("Not included in the totals (request for quotation, priced after review):", "غير مشمول في الإجماليات (بعرض سعر، يُسعَّر بعد المراجعة):"))}</b> ${esc(T.rfqItems.map((x) => (lang === "ar" ? x.ar || x.en : x.en)).join(lang === "ar" ? "، " : ", "))}</p>` : "";

  const summary = `<table class="sumtable">
    <tr><td>${esc(t("Ductwork subtotal", "إجمالي الدكت"))}</td><td class="num">${esc(money(T.ductSubtotal))}</td></tr>
    <tr><td>${esc(t("Accessories subtotal", "إجمالي الإكسسوارات"))}</td><td class="num">${esc(money(T.accessoriesSubtotal))}</td></tr>
    <tr><td>${esc(t("Additional services", "الخدمات الإضافية"))}</td><td class="num">${esc(money(T.servicesSubtotal))}</td></tr>
    <tr><td>${esc(t("Discount", "الخصم"))}</td><td class="num">${T.discount ? `- ${esc(money(T.discount))}` : "—"}</td></tr>
    <tr><td><b>${esc(t("Subtotal before VAT", "المجموع قبل الضريبة"))}</b></td><td class="num"><b>${esc(money(T.subtotal))}</b></td></tr>
    <tr><td>${esc(t(`VAT ${T.vatPercent}%`, `ضريبة القيمة المضافة ${T.vatPercent}%`))}</td><td class="num">${esc(money(T.vat))}</td></tr>
    <tr class="total"><td>${esc(t("Grand total including VAT", "الإجمالي شامل الضريبة"))}</td><td class="num">${esc(money(T.total))}</td></tr></table>`;

  const systemsBlock = s.systems.map((x) => `<div class="box" style="margin-bottom:6pt"><h4>${esc(lang === "ar" ? x.nameAr : x.nameEn)}</h4><div class="cols"><div><b>${esc(t("Included", "المشمول"))}</b>${list(pick(x.included))}</div><div><b>${esc(t("Not included", "غير المشمول"))}</b>${list(pick(x.notIncluded))}</div></div>${pick(x.technical).length ? `<div><b>${esc(t("Technical specifications", "المواصفات الفنية"))}</b>${list(pick(x.technical))}</div>` : ""}</div>`).join("");
  const specTable = `<table class="kv">${s.specRows.map((r) => `<tr><td>${esc(lang === "ar" ? r.labelAr : r.labelEn)}</td><td${r.confirmed ? "" : ' class="review"'}>${esc(lang === "ar" ? r.valueAr : r.valueEn)}</td></tr>`).join("")}</table>`;
  const files = s.files.length ? list(s.files.map((f) => `${f.category === "drawing" ? t("Drawing", "مخطط") : f.category === "boq" ? t("BOQ", "جدول كميات") : t("File", "ملف")}: ${f.name}`)) : `<span class="muted">${esc(t("No drawings or BOQ were attached.", "لم يتم إرفاق مخططات أو جدول كميات."))}</span>`;
  const title = t("OSTA – HVAC Ductwork Quotation", "OSTA – عرض سعر تصنيع وتركيب الدكت");

  return `
  <div class="band"${first ? "" : ""}><div><div class="title">${esc(title)}</div><div class="sub">${ltr(COMPANY.name)} · ${ltr(COMPANY.website)} · ${ltr(COMPANY.phone)}</div><span class="qmark">${esc(pickBi(s.estimateNotice))}</span></div><div style="text-align:end"><img alt="OSTA" src="data:image/jpeg;base64,${CONTRACT_LOGO_JPEG}"/><div class="sub">${esc(t("Quotation No.", "رقم عرض السعر"))}: ${ltr(d.number)}</div></div></div>
  <div class="sec" style="margin-top:0"><h2>${L[0]}. ${esc(t("Quotation Details", "بيانات عرض السعر"))}</h2>${kv([
    [t("Quotation number", "رقم عرض السعر"), ltr(d.number)], [t("Version", "الإصدار"), ltr(String(d.version))], [t("Quotation date", "تاريخ عرض السعر"), esc(fmtDate(d.createdAt, lang))], [t("Valid until", "صالح حتى"), esc(`${fmtDate(d.expiresAt, lang)} (${s.validityDays} ${t("days", "يوماً")})`)],
  ])}</div>
  <div class="sec"><h2>${L[1]}. ${esc(t("Customer & Project", "بيانات العميل والمشروع"))}</h2>${kv([
    [t("Customer name", "اسم العميل"), esc(c.name)], ...(c.company ? ([[t("Company", "الشركة"), esc(c.company)]] as [string, string][]) : []), [t("Mobile", "الجوال"), ltr(c.phone)], ...(c.email ? ([[t("Email", "البريد الإلكتروني"), ltr(c.email)]] as [string, string][]) : []),
    [t("Emirate", "الإمارة"), esc(pickBi(d.emirateLabel))], [t("Project type", "نوع المشروع"), esc(pickBi(d.projectTypeLabel))], ...(p.projectName ? ([[t("Project name", "اسم المشروع"), esc(p.projectName)]] as [string, string][]) : []),
    [t("Project location", "موقع المشروع"), esc(p.location || "—")], [t("Site address", "عنوان الموقع"), esc(p.siteAddress || "—")], [t("Project description", "وصف المشروع"), esc(p.description || "—")],
  ])}</div>
  <div class="sec"><h2>${L[2]}. ${esc(t("Selected Ductwork Systems", "أنظمة الدكت المختارة"))}</h2>
    <table class="items long"><tr><th>#</th><th>${esc(t("Description", "الوصف"))}</th><th>${esc(t("System", "النظام"))}</th><th class="num">${esc(t("Area / Qty", "المساحة / الكمية"))}</th><th>${esc(t("Unit", "الوحدة"))}</th><th class="num">${esc(t("Rate", "السعر"))}</th><th class="num">${esc(t("Total", "الإجمالي"))}</th></tr>${ductRows}</table>${rfqNote}
    <h4 style="margin:8pt 0 3pt">${esc(t("Dimensions and calculated areas", "الأبعاد والمساحات المحسوبة"))}</h4>
    <table class="items long"><tr><th>#</th><th>${esc(t("System / work", "النظام / نوع العمل"))}</th><th>${esc(t("Dimensions", "الأبعاد"))}</th><th class="num">${esc(t("Area (m²)", "المساحة (م²)"))}</th></tr>${secRows}</table>
    <table class="items" style="margin-top:6pt"><tr><th>${esc(t("Total area per system", "إجمالي المساحة لكل نظام"))}</th><th class="num">m²</th></tr>${areaRows}<tr class="total"><td>${esc(t("Total ductwork area", "إجمالي مساحة الدكت"))}</td>${num(ltr(`${qty(T.totalArea)} m²`))}</tr></table>
    <p class="note">${esc(pickBi(s.straightDuctNote))}</p></div>
  <div class="sec"><h2>${L[3]}. ${esc(t("Accessories & Components", "الإكسسوارات والمكونات"))}</h2>${simpleTable("accessory")}</div>
  <div class="sec"><h2>${L[4]}. ${esc(t("Additional Services", "الخدمات الإضافية"))}</h2>${simpleTable("service")}</div>
  <div class="sec"><h2>${L[5]}. ${esc(t("Financial Summary", "الملخص المالي"))}</h2>${summary}<p class="note">${esc(t("Prices are in UAE Dirhams (AED). VAT is calculated once, on the subtotal after any discount.", "الأسعار بالدرهم الإماراتي. تُحسب الضريبة مرة واحدة على المجموع بعد الخصم إن وُجد."))}</p></div>
  <div class="sec"><h2>${L[6]}. ${esc(t("Included & Excluded", "المشمول وغير المشمول"))}</h2>${systemsBlock}</div>
  <div class="sec"><h2>${L[7]}. ${esc(t("Technical Specifications", "المواصفات الفنية"))}</h2>${specTable}${s.review.length ? `<p class="note review"><b>${esc(pickBi(s.reviewNote))}</b> ${esc(s.review.map((r) => (lang === "ar" ? r.ar : r.en)).join(lang === "ar" ? "، " : ", "))}</p>` : ""}</div>
  <div class="sec"><h2>${L[8]}. ${esc(t("Drawings & BOQ", "المخططات وجدول الكميات"))}</h2>${files}</div>
  <div class="sec"><h2>${L[9]}. ${esc(t("Terms, Conditions & Validity", "الشروط والأحكام والصلاحية"))}</h2>${list(pick(s.terms))}<p class="note">${esc(t(`This quotation is valid for ${s.validityDays} days from its date (until ${fmtDate(d.expiresAt, lang)}).`, `هذا العرض صالح لمدة ${s.validityDays} يوماً من تاريخه (حتى ${fmtDate(d.expiresAt, lang)}).`))}</p><p><b>${esc(pickBi(s.estimateNotice))}</b></p><p class="note">${esc(COMPANY.name)} · ${esc(COMPANY.website)} · ${esc(COMPANY.phone)}</p></div>`;
}

export function renderDuctHtml(d: DuctDocInput, pdf: PdfLang): string {
  const pageLang: Lang = pdf === "ar" ? "ar" : "en";
  const wm = pdf === "ar" ? "عرض سعر – تقديري" : "QUOTATION – ESTIMATE";
  const parts = pdf === "both"
    ? `<div dir="ltr" lang="en">${body(d, "en", true)}</div><div dir="rtl" lang="ar" class="part">${body(d, "ar", false)}</div>`
    : `<div>${body(d, pageLang, true)}</div>`;
  const title = "OSTA – HVAC Ductwork Quotation";
  return `<!doctype html><html lang="${pageLang}" dir="${pageLang === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8"/><title>${esc(title)} ${esc(d.number)}</title><style>${PDF_CSS}${EXTRA_CSS}${pageCss({ lang: pageLang }, d.number)}</style></head><body><div class="wm draft">${esc(wm)}</div>${parts}</body></html>`;
}
