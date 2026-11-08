import type { Lang } from "@/lib/maintenance/builder";
import { COMPANY } from "@/lib/contracts/clauses";
import { CONTRACT_LOGO_JPEG } from "@/lib/contracts/assets.generated";
import { PDF_CSS, esc, fmtDate, fmtMoney, ltr, pageCss } from "@/lib/contracts/html";
import type { QuoteCustomer, QuoteProject, QuoteSnapshot } from "./snapshot";

// The quotation as a printable page (A4, English or Arabic, left-to-right or right-to-left). Pure: the same record always gives the same page.

export type QuoteDocInput = {
  snapshot: QuoteSnapshot;
  lang: Lang;
  number: string;
  version: number;
  createdAt: Date;
  expiresAt: Date;
  customer: QuoteCustomer;
  project: QuoteProject;
  propertyTypeLabel: Bi2;
  emirateLabel: Bi2;
};
type Bi2 = { en: string; ar: string };

const YES_NO: Record<string, Bi2> = { yes: { en: "Yes", ar: "نعم" }, no: { en: "No", ar: "لا" }, "not-sure": { en: "Not sure", ar: "غير متأكد" } };
const CEILING: Record<string, Bi2> = { false: { en: "False ceiling", ar: "سقف مستعار" }, exposed: { en: "Exposed ceiling", ar: "سقف مكشوف" }, other: { en: "Other", ar: "أخرى" } };
const CONTACT: Record<string, Bi2> = { phone: { en: "Phone call", ar: "اتصال هاتفي" }, whatsapp: { en: "WhatsApp", ar: "واتساب" }, email: { en: "Email", ar: "البريد الإلكتروني" } };

const EXTRA_CSS = `
.qmark{display:inline-block;margin-top:5pt;padding:3pt 10pt;border-radius:4pt;font-weight:700;font-size:9pt;background:#fef3c7;color:#92400e;border:1pt solid #f59e0b}
.items th.num,.items td.num{text-align:end}
.items td.sub{color:#475569;font-size:8.5pt}
.rfq{color:#b45309;font-weight:700}
.sumtable{width:62%;margin-inline-start:auto}
.sumtable td{border:.6pt solid #cbd5e1}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:8pt}
`;

export function renderQuoteHtml(d: QuoteDocInput): string {
  const { snapshot: s, lang } = d;
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const money = (n: number | null) => (n == null ? t("Request for quotation", "بعرض سعر") : fmtMoney(n, "AED", lang));
  const label = (l: { labelEn: string; labelAr: string }) => (lang === "ar" ? l.labelAr || l.labelEn : l.labelEn);
  const detail = (l: { detailEn: string; detailAr: string }) => (lang === "ar" ? l.detailAr || l.detailEn : l.detailEn);
  const T = s.totals;
  const kv = (rows: [string, string][]) => `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join("")}</table>`;
  const list = (items: string[]) => (items.length ? `<ul style="padding-inline-start:14pt">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<span class="muted">—</span>`);
  const pick = (b: { en: string[]; ar: string[] }) => (lang === "ar" && b.ar.length ? b.ar : b.en);
  const title = t("OSTA – Installation Quotation", "OSTA – عرض سعر تركيب مكيفات");
  const L = lang === "ar" ? ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"] : ["A", "B", "C", "D", "E", "F", "G", "H"];

  const rows = s.lines.map((l, i) => {
    const note = detail(l);
    return `<tr><td>${i + 1}</td><td>${esc(label(l))}${note ? `<div class="sub">${esc(note)}</div>` : ""}</td><td class="num">${l.qty}</td><td class="num">${l.unitPrice == null ? `<span class="rfq">${esc(money(null))}</span>` : esc(money(l.unitPrice))}</td><td class="num">${l.amount == null ? `<span class="rfq">${esc(money(null))}</span>` : esc(money(l.amount))}</td></tr>`;
  }).join("");

  const summary = `<table class="sumtable">
    <tr><td>${esc(t("Base installation", "سعر التركيب الأساسي"))}</td><td class="num">${esc(money(T.baseTotal))}</td></tr>
    <tr><td>${esc(t(`Plenum Modification & Connection (${money(s.plenum.price)} per unit)`, `تعديل وتوصيل البلينم (${money(s.plenum.price)} لكل وحدة)`))}</td><td class="num">${esc(money(T.plenumTotal))}</td></tr>
    <tr><td>${esc(t("Additional services", "الخدمات الإضافية"))}</td><td class="num">${esc(money(T.servicesTotal))}</td></tr>
    <tr><td><b>${esc(t("Subtotal (excluding VAT)", "المجموع قبل الضريبة"))}</b></td><td class="num"><b>${esc(money(T.subtotal))}</b></td></tr>
    <tr><td>${esc(t(`VAT ${T.vatPercent}%`, `ضريبة القيمة المضافة ${T.vatPercent}%`))}</td><td class="num">${esc(money(T.vat))}</td></tr>
    <tr class="total"><td>${esc(t("Grand total including VAT", "الإجمالي شامل الضريبة"))}</td><td class="num">${esc(money(T.total))}</td></tr></table>`;

  const rfqNote = T.rfq ? `<p class="note" style="margin-top:6pt"><b>${esc(t("Not included in the totals (request for quotation, priced after inspection):", "غير مشمول في الإجمالي (بعرض سعر، يُسعَّر بعد المعاينة):"))}</b> ${esc(T.rfqItems.map((x) => (lang === "ar" ? x.ar || x.en : x.en)).join(lang === "ar" ? "، " : ", "))}</p>` : "";

  const packages = s.packages.map((p) => `<div class="box" style="margin-bottom:6pt"><h4>${esc(lang === "ar" ? p.nameAr : p.nameEn)} – ${esc(lang === "ar" ? p.subtitleAr : p.subtitleEn)}</h4><div class="cols"><div><b>${esc(t("Included", "المشمول"))}</b>${list(pick(p.included))}</div><div><b>${esc(t("Not included", "غير المشمول"))}</b>${list(pick(p.notIncluded))}</div></div></div>`).join("");
  const plenum = `<div class="box"><h4>${esc(lang === "ar" ? s.plenum.nameAr : s.plenum.nameEn)} – ${esc(money(s.plenum.price))} ${esc(t("per unit", "لكل وحدة"))}</h4><div class="cols"><div><b>${esc(t("Includes", "تشمل"))}</b>${list(pick(s.plenum.included))}</div><div><b>${esc(t("Does not include", "لا تشمل"))}</b>${list(pick(s.plenum.notIncluded))}</div></div></div>`;

  const c = d.customer, p = d.project;
  const body = `
  <div class="wm draft">${esc(t("QUOTATION – ESTIMATE", "عرض سعر – تقديري"))}</div>
  <div class="band"><div><div class="title">${esc(title)}</div><div class="sub">${ltr(COMPANY.name)} · ${ltr(COMPANY.website)} · ${ltr(COMPANY.phone)}</div><span class="qmark">${esc(t("ESTIMATE – SUBJECT TO SITE INSPECTION", "تقديري – يخضع لمعاينة الموقع"))}</span></div><div style="text-align:end"><img alt="OSTA" src="data:image/jpeg;base64,${CONTRACT_LOGO_JPEG}"/><div class="sub">${esc(t("Quotation No.", "رقم عرض السعر"))}: ${ltr(d.number)}</div></div></div>
  <div class="sec" style="margin-top:0"><h2>${L[0]}. ${esc(t("Quotation Details", "بيانات عرض السعر"))}</h2>${kv([
    [t("Quotation number", "رقم عرض السعر"), ltr(d.number)], [t("Version", "الإصدار"), ltr(String(d.version))],
    [t("Quotation date", "تاريخ عرض السعر"), esc(fmtDate(d.createdAt, lang))], [t("Valid until", "صالح حتى"), esc(`${fmtDate(d.expiresAt, lang)} (${s.validityDays} ${t("days", "يوماً")})`)],
  ])}</div>
  <div class="sec"><h2>${L[1]}. ${esc(t("Customer & Project", "بيانات العميل والمشروع"))}</h2>${kv([
    [t("Customer name", "اسم العميل"), esc(c.name)], [t("Mobile", "الجوال"), ltr(c.phone)], ...(c.whatsapp ? ([[t("WhatsApp", "واتساب"), ltr(c.whatsapp)]] as [string, string][]) : []), ...(c.email ? ([[t("Email", "البريد الإلكتروني"), ltr(c.email)]] as [string, string][]) : []),
    [t("Preferred contact", "وسيلة التواصل المفضلة"), esc(CONTACT[c.contactMethod]?.[lang] ?? "—")],
    [t("Emirate", "الإمارة"), esc(d.emirateLabel[lang])], [t("Project location", "موقع المشروع"), esc(p.location || "—")], [t("Property type", "نوع العقار"), esc(d.propertyTypeLabel[lang])],
    [t("Number of floors", "عدد الطوابق"), esc(String(p.floors || "—"))], [t("Existing duct available", "هل الدكت موجود"), esc(YES_NO[p.existingDuct]?.[lang] ?? "—")], [t("Existing copper pipes available", "هل مواسير النحاس موجودة"), esc(YES_NO[p.existingCopper]?.[lang] ?? "—")],
    [t("Ceiling type", "نوع السقف"), esc(CEILING[p.ceilingType]?.[lang] ?? "—")], [t("Preferred installation date", "تاريخ التركيب المفضل"), esc(c.preferredDate ? fmtDate(c.preferredDate, lang) : "—")], [t("Project notes", "ملاحظات المشروع"), esc(p.notes || "—")],
  ])}</div>
  <div class="sec"><h2>${L[2]}. ${esc(t("Quotation Items", "بنود عرض السعر"))}</h2><table class="items long"><tr><th>#</th><th>${esc(t("Description", "الوصف"))}</th><th class="num">${esc(t("Qty", "الكمية"))}</th><th class="num">${esc(t("Unit price", "سعر الوحدة"))}</th><th class="num">${esc(t("Amount", "المبلغ"))}</th></tr>${rows}</table>${rfqNote}</div>
  <div class="sec"><h2>${L[3]}. ${esc(t("Price Summary", "ملخص السعر"))}</h2>${summary}<p class="note">${esc(t("Prices are in UAE Dirhams (AED). VAT is calculated once, on the subtotal.", "الأسعار بالدرهم الإماراتي. تُحسب الضريبة مرة واحدة على المجموع."))}</p></div>
  <div class="sec"><h2>${L[4]}. ${esc(t("What Is Included", "ما يشمله العرض"))}</h2>${packages}${plenum}</div>
  <div class="sec"><h2>${L[5]}. ${esc(t("Not Included in the Prices", "غير مشمول في الأسعار"))}</h2>${list(pick(s.exclusions))}</div>
  <div class="sec"><h2>${L[6]}. ${esc(t("Terms & Validity", "الشروط وصلاحية العرض"))}</h2>
    <p>${esc(lang === "ar" ? s.disclaimer.ar : s.disclaimer.en)}</p>
    <ul style="padding-inline-start:14pt"><li>${esc(t(`This quotation is valid for ${s.validityDays} days from its date (until ${fmtDate(d.expiresAt, lang)}).`, `هذا العرض صالح لمدة ${s.validityDays} يوماً من تاريخه (حتى ${fmtDate(d.expiresAt, lang)}).`))}</li>
    <li>${esc(t("Sending this quotation to OSTA or requesting a booking does not confirm an installation appointment. Our team reviews every request and confirms it with you.", "إرسال عرض السعر إلى اسطا أو طلب الحجز لا يعني تأكيد موعد التركيب. يراجع فريقنا كل طلب ويؤكده معك."))}</li>
    <li>${esc(t("Items marked “request for quotation” need measurements or a site visit and are priced separately.", "البنود المعلّمة «بعرض سعر» تحتاج إلى قياسات أو معاينة ويتم تسعيرها بشكل منفصل."))}</li></ul>
    <p class="note">${esc(COMPANY.name)} · ${esc(COMPANY.website)} · ${esc(COMPANY.phone)}</p></div>`;

  return `<!doctype html><html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8"/><title>${esc(title)} ${esc(d.number)}</title><style>${PDF_CSS}${EXTRA_CSS}${pageCss({ lang }, d.number)}</style></head><body>${body}</body></html>`;
}
