import type { Lang } from "@/lib/maintenance/builder";
import { COMPANY } from "@/lib/contracts/clauses";
import { CONTRACT_LOGO_JPEG } from "@/lib/contracts/assets.generated";
import { PDF_CSS, esc, fmtDate, fmtMoney, ltr, pageCss } from "@/lib/contracts/html";
import type { PdfLang } from "@/lib/ductwork/html";
import type { Bi } from "./config";
import type { SplitCustomer, SplitProject, SplitSnapshot } from "./snapshot";

// The Split AC quotation as a printable A4 page: English, Arabic (right-to-left), or BOTH in one PDF (the English pages, then the Arabic
// pages). Pure: the same record always gives the same page. Only the packages the customer selected are described.

export const COMPANY_EMAIL = "info@ostaservices.com";

export type SplitDocInput = {
  snapshot: SplitSnapshot; number: string; version: number; createdAt: Date; expiresAt: Date;
  customer: SplitCustomer; project: SplitProject; propertyTypeLabel: Bi; emirateLabel: Bi;
};

const EXTRA_CSS = `
.qmark{display:inline-block;margin-top:5pt;padding:3pt 10pt;border-radius:4pt;font-weight:700;font-size:8.5pt;background:#fef3c7;color:#92400e;border:1pt solid #f59e0b}
.items th.num,.items td.num{text-align:end}.items td.sub{color:#475569;font-size:8.5pt}
.rfq{color:#b45309;font-weight:700}.sumtable{width:62%;margin-inline-start:auto}.sumtable td{border:.6pt solid #cbd5e1}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:8pt}.part{break-before:page}.box{break-inside:avoid}
.ok li::marker{content:"✓  ";color:#047857}.no li::marker{content:"✕  ";color:#b91c1c}.thanks{margin-top:14pt;padding:10pt;border-top:1.2pt solid #1e5bd8;text-align:center}
`;

function body(d: SplitDocInput, lang: Lang): string {
  const s = d.snapshot;
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const pickBi = (b: Bi) => (lang === "ar" ? b.ar || b.en : b.en);
  const money = (n: number | null) => (n == null ? t("Request for quotation", "بعرض سعر") : fmtMoney(n, "AED", lang));
  const label = (l: { labelEn: string; labelAr: string }) => (lang === "ar" ? l.labelAr || l.labelEn : l.labelEn);
  const T = s.totals;
  const kv = (rows: [string, string][]) => `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join("")}</table>`;
  const list = (items: string[], cls = "") => (items.length ? `<ul class="${cls}" style="padding-inline-start:14pt">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<span class="muted">—</span>`);
  const pick = (b: { en: string[]; ar: string[] }) => (lang === "ar" && b.ar.length ? b.ar : b.en);
  const L = lang === "ar" ? ["أ", "ب", "ج", "د", "هـ", "و", "ز"] : ["A", "B", "C", "D", "E", "F", "G"];
  const c = d.customer, p = d.project;
  const rate = (l: { unitPrice: number | null }) => (l.unitPrice == null ? `<span class="rfq">${esc(money(null))}</span>` : esc(money(l.unitPrice)));
  const amt = (l: { amount: number | null; kind: string }) => (l.amount == null ? `<span class="rfq">${esc(money(null))}</span>` : `${l.kind === "discount" ? "- " : ""}${esc(money(l.amount))}`);

  const rows = s.lines.map((l, i) => {
    const sub = l.kind === "unit" ? "" : lang === "ar" ? l.detailAr || l.detailEn : l.detailEn;
    return `<tr><td>${i + 1}</td><td>${esc(label(l))}${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</td><td>${esc(l.kind === "unit" ? (lang === "ar" ? l.packageAr : l.packageEn) : "—")}</td><td>${esc(l.kind === "unit" ? (lang === "ar" ? l.capacityAr : l.capacityEn) : "—")}</td><td class="num">${ltr(String(l.qty))}</td><td class="num">${rate(l)}</td><td class="num">${amt(l)}</td></tr>`;
  }).join("");
  const rfqNote = T.rfq ? `<p class="note" style="margin-top:6pt"><b>${esc(t("Not included in the totals (request for quotation, priced after review):", "غير مشمول في الإجماليات (بعرض سعر، يُسعَّر بعد المراجعة):"))}</b> ${esc(T.rfqItems.map((x) => (lang === "ar" ? x.ar || x.en : x.en)).join(lang === "ar" ? "، " : ", "))}</p>` : "";

  const summary = `<table class="sumtable">
    <tr><td>${esc(t("Subtotal – AC installation", "المجموع – تركيب المكيفات"))}</td><td class="num">${esc(money(T.unitsTotal))}</td></tr>
    <tr><td>${esc(t("Additional services", "الخدمات الإضافية"))}</td><td class="num">${esc(money(T.servicesTotal))}</td></tr>
    <tr><td>${esc(t("Discount", "الخصم"))}</td><td class="num">${T.discount ? `- ${esc(money(T.discount))}` : "—"}</td></tr>
    <tr><td><b>${esc(t("Total before VAT", "الإجمالي قبل الضريبة"))}</b></td><td class="num"><b>${esc(money(T.subtotal))}</b></td></tr>
    <tr><td>${esc(t(`VAT ${T.vatPercent}%`, `ضريبة القيمة المضافة ${T.vatPercent}%`))}</td><td class="num">${esc(money(T.vat))}</td></tr>
    <tr class="total"><td>${esc(t("Grand Total (AED)", "الإجمالي الكلي (درهم)"))}</td><td class="num">${esc(money(T.total))}</td></tr></table>`;

  const packages = s.packages.map((k) => `<div class="box" style="margin-bottom:6pt"><h4>${esc(lang === "ar" ? k.nameAr : k.nameEn)}</h4>
    <p class="note" style="margin:2pt 0 4pt"><b>${esc(t("Copper pipe allowance", "حد مواسير النحاس"))}:</b> ${k.copperMeters > 0 ? esc(t(`up to ${k.copperMeters} metres (the total piping route between the indoor and outdoor units)`, `حتى ${k.copperMeters} أمتار (إجمالي مسار المواسير بين الوحدة الداخلية والخارجية)`)) : esc(t("none – the copper pipes already on site are used", "لا يوجد – تُستخدم مواسير النحاس الموجودة بالموقع"))}</p>
    <div class="cols"><div>${pick(k.materials).length ? `<b>${esc(t("Included materials", "الخامات المشمولة"))}</b>${list(pick(k.materials), "ok")}` : ""}<b>${esc(t("Included services", "الخدمات المشمولة"))}</b>${list(pick(k.services), "ok")}</div>
    <div><b>${esc(t("Not included", "غير مشمول"))}</b>${list(pick(k.notIncluded), "no")}</div></div></div>`).join("");

  const title = t("OSTA – Split AC Installation Quotation", "OSTA – عرض سعر تركيب مكيف سبليت");
  return `
  <div class="band"><div><div class="title">${esc(title)}</div><div class="sub">${ltr(COMPANY.name)}<br/>${ltr(COMPANY.website)} · ${ltr(COMPANY_EMAIL)} · ${ltr(COMPANY.phone)}</div><span class="qmark">${esc(t("ESTIMATE – SUBJECT TO SITE INSPECTION", "تقديري – يخضع لمعاينة الموقع"))}</span></div><div style="text-align:end"><img alt="OSTA" src="data:image/jpeg;base64,${CONTRACT_LOGO_JPEG}" style="height:46pt"/></div></div>
  <div class="sec" style="margin-top:0"><h2>${L[0]}. ${esc(t("Quotation Details", "بيانات عرض السعر"))}</h2>${kv([
    [t("Quotation number", "رقم عرض السعر"), ltr(d.number)], [t("Version", "الإصدار"), ltr(String(d.version))], [t("Quotation date", "تاريخ عرض السعر"), esc(fmtDate(d.createdAt, lang))],
    [t("Valid until", "صالح حتى"), esc(`${fmtDate(d.expiresAt, lang)} (${s.validityDays} ${t("days", "يوماً")})`)],
  ])}</div>
  <div class="sec"><h2>${L[1]}. ${esc(t("Customer Information", "بيانات العميل"))}</h2>${kv([
    [t("Customer name", "اسم العميل"), esc(c.name)], [t("Mobile / WhatsApp", "الجوال / واتساب"), ltr(c.phone)], ...(c.email ? ([[t("Email", "البريد الإلكتروني"), ltr(c.email)]] as [string, string][]) : []),
    [t("Emirate", "الإمارة"), esc(pickBi(d.emirateLabel))], [t("Area / location", "المنطقة / الموقع"), esc(p.location || "—")], [t("Installation address", "عنوان التركيب"), esc(p.address || "—")],
    [t("Property type", "نوع العقار"), esc(pickBi(d.propertyTypeLabel))], ...(p.notes ? ([[t("Notes", "ملاحظات"), esc(p.notes)]] as [string, string][]) : []),
  ])}</div>
  <div class="sec"><h2>${L[2]}. ${esc(t("Quotation Items", "بنود عرض السعر"))}</h2>
    <table class="items long"><tr><th>#</th><th>${esc(t("Description", "الوصف"))}</th><th>${esc(t("Package", "الباقة"))}</th><th>${esc(t("AC Capacity", "سعة المكيف"))}</th><th class="num">${esc(t("Qty", "الكمية"))}</th><th class="num">${esc(t("Unit Price", "سعر الوحدة"))}</th><th class="num">${esc(t("Total", "الإجمالي"))}</th></tr>${rows}</table>${rfqNote}</div>
  <div class="sec"><h2>${L[3]}. ${esc(t("Financial Summary", "الملخص المالي"))}</h2>${summary}<p class="note">${esc(t("Prices are in UAE Dirhams (AED). VAT is calculated once, on the subtotal after any discount.", "الأسعار بالدرهم الإماراتي. تُحسب الضريبة مرة واحدة على المجموع بعد الخصم إن وُجد."))}</p></div>
  <div class="sec"><h2>${L[4]}. ${esc(t("Package Details", "تفاصيل الباقات"))}</h2>${packages}</div>
  <div class="sec"><h2>${L[5]}. ${esc(t("Terms & Conditions", "الشروط والأحكام"))}</h2>${list(pick(s.conditions))}<p class="note"><b>${esc(pickBi(s.technicalNote))}</b></p><p class="note">${esc(pickBi(s.disclaimer))}</p>
    <p class="note">${esc(t(`This quotation is valid for ${s.validityDays} days from its date (until ${fmtDate(d.expiresAt, lang)}). Requesting a booking does not confirm an installation appointment: our team reviews every request and confirms it with you.`, `هذا العرض صالح لمدة ${s.validityDays} يوماً من تاريخه (حتى ${fmtDate(d.expiresAt, lang)}). طلب الحجز لا يعني تأكيد موعد التركيب: يراجع فريقنا كل طلب ويؤكده معك.`))}</p></div>
  <div class="thanks"><b>${esc(pickBi(s.footer).split(/(?<=\.)\s+/)[0] ?? "")}</b><br/>${esc(pickBi(s.footer).split(/(?<=\.)\s+/).slice(1).join(" "))}</div>`;
}

export function renderSplitHtml(d: SplitDocInput, pdf: PdfLang): string {
  const pageLang: Lang = pdf === "ar" ? "ar" : "en";
  const wm = pdf === "ar" ? "عرض سعر – تقديري" : "QUOTATION – ESTIMATE";
  const parts = pdf === "both"
    ? `<div dir="ltr" lang="en">${body(d, "en")}</div><div dir="rtl" lang="ar" class="part">${body(d, "ar")}</div>`
    : `<div>${body(d, pageLang)}</div>`;
  const title = "OSTA – Split AC Installation Quotation";
  return `<!doctype html><html lang="${pageLang}" dir="${pageLang === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8"/><title>${esc(title)} ${esc(d.number)}</title><style>${PDF_CSS}${EXTRA_CSS}${pageCss({ lang: pageLang }, d.number)}</style></head><body><div class="wm draft">${esc(wm)}</div>${parts}</body></html>`;
}
