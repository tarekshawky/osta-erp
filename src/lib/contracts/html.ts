import type { Lang } from "@/lib/maintenance/builder";
import { COMPANY, RESPONSIBILITIES, type Clause } from "./clauses";
import type { ContractSnapshot } from "./snapshot";
import { CONTRACT_FONTS, CONTRACT_LOGO_JPEG } from "./assets.generated";

// Draws an agreement (or an addendum) as one self-contained HTML page that the PDF engine prints. It is pure: the same snapshot
// always gives the same page, in either language, with the right reading direction.

export type DocKind = "draft" | "final";

export type ContractDocInput = {
  snapshot: ContractSnapshot;
  lang: Lang;
  kind: DocKind;
  number: string;
  requestNumber: string;
  version: number;
  createdAt: Date;
  acceptedAt: Date | null;
  acceptanceMethod: string;
  paymentStatus: "unpaid" | "paid" | "arrangement";
  paymentMethod: string;
  paymentReference: string;
  paidAt: Date | null;
  activationDate: Date | null;
  expiryDate: Date | null;
  approvedAt: Date | null;
};

export type AddendumDocInput = {
  contractNumber: string;
  number: string;
  lang: Lang;
  issuedAt: Date;
  titleEn: string; titleAr: string; bodyEn: string; bodyAr: string;
  amountChange: number;
  customerName: string;
  propertyAddress: string;
  currency: string;
  acceptedAt: Date | null;
};

export const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const cssStr = (v: string) => v.replace(/[\\"]/g, "\\$&").replace(/\n/g, " ");

export const MARKS: Record<DocKind, { en: string; ar: string }> = {
  draft: { en: "DRAFT – PENDING APPROVAL", ar: "مسودة – بانتظار الاعتماد" },
  final: { en: "FINAL – PAID & ACTIVATED", ar: "نهائي – مدفوع ومفعّل" },
};

function fmtMoney(n: number | null | undefined, currency: string, lang: Lang) {
  if (n == null) return lang === "ar" ? "عرض سعر مخصص" : "Custom quotation";
  const s = n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  return lang === "ar" ? `${s} ${currency === "AED" ? "د.إ" : currency}` : `${currency} ${s}`;
}

function fmtDate(d: Date | null, lang: Lang, withTime = false) {
  if (!d) return "—";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB", {
    timeZone: "Asia/Dubai", day: "2-digit", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(d) + (withTime ? " (GST)" : "");
}

// Latin text (numbers, phone, email) inside Arabic text keeps its own direction.
const ltr = (v: string) => `<span dir="ltr">${esc(v)}</span>`;

function bodyHtml(body: string) {
  const out: string[] = [];
  for (const block of body.split(/\n{2,}/)) {
    const lines = block.split("\n");
    const bullets = lines.filter((l) => l.startsWith("- "));
    const rest = lines.filter((l) => !l.startsWith("- ")).join(" ").trim();
    if (rest) out.push(`<p>${esc(rest)}</p>`);
    if (bullets.length) out.push(`<ul>${bullets.map((l) => `<li>${esc(l.slice(2))}</li>`).join("")}</ul>`);
  }
  return out.join("");
}

const CSS = `
@font-face{font-family:"OstaDoc";font-weight:400;src:url(data:font/woff2;base64,${CONTRACT_FONTS.latin400}) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"OstaDoc";font-weight:700;src:url(data:font/woff2;base64,${CONTRACT_FONTS.latin700}) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"OstaDoc";font-weight:400;src:url(data:font/woff2;base64,${CONTRACT_FONTS.arabic400}) format("woff2");unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+0609,U+060C,U+061B,U+061F}
@font-face{font-family:"OstaDoc";font-weight:700;src:url(data:font/woff2;base64,${CONTRACT_FONTS.arabic700}) format("woff2");unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+0609,U+060C,U+061B,U+061F}
*{box-sizing:border-box}
html{font-family:"OstaDoc",sans-serif;color:#0f172a;font-size:9.5pt;line-height:1.5}
body{margin:0}
h1,h2,h3,h4,p,ul,ol{margin:0}
.wm{position:fixed;top:44%;left:0;right:0;text-align:center;transform:rotate(-28deg);font-size:32pt;font-weight:700;white-space:nowrap;z-index:-1;pointer-events:none}
.wm.draft{color:rgba(217,119,6,.12)}
.wm.final{color:rgba(22,163,74,.11)}
.band{display:flex;justify-content:space-between;align-items:center;gap:12pt;border-bottom:2.5pt solid #1e5bd8;padding-bottom:10pt;margin-bottom:12pt}
.band img{height:46pt;width:auto}
.title{font-size:17pt;font-weight:700;color:#0f172a}
.sub{font-size:9pt;color:#475569}
.mark{display:inline-block;margin-top:5pt;padding:3pt 10pt;border-radius:4pt;font-weight:700;font-size:9pt;letter-spacing:.4pt}
.mark.draft{background:#fef3c7;color:#92400e;border:1pt solid #f59e0b}
.mark.final{background:#dcfce7;color:#166534;border:1pt solid #22c55e}
.sec{margin-top:11pt}
.sec table{break-inside:avoid}
.sec table.long{break-inside:auto}
.sec h2{font-size:11.5pt;color:#1e40af;background:#eff6ff;border-inline-start:3.5pt solid #1e5bd8;padding:4pt 8pt;margin-bottom:6pt;break-after:avoid}
table{width:100%;border-collapse:collapse}
td,th{border:.6pt solid #cbd5e1;padding:3pt 6pt;vertical-align:top;text-align:start}
th{background:#f1f5f9;font-weight:700;font-size:9pt}
tr{break-inside:avoid}
.kv td:first-child{width:34%;background:#f8fafc;font-weight:700;color:#334155}
.num{text-align:end;white-space:nowrap}
.total td{background:#eff6ff;font-weight:700;font-size:10.5pt}
.clause{margin-bottom:7pt;break-inside:avoid}
.clause h3{font-size:10pt;margin-bottom:2pt;color:#0f172a}
.clause p{margin-bottom:3pt;text-align:justify}
.clause ul{padding-inline-start:16pt;margin-bottom:3pt}
.muted{color:#64748b}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10pt}
.box{border:.6pt solid #cbd5e1;border-radius:4pt;padding:6pt 8pt}
.box h4{font-size:9.5pt;margin-bottom:3pt;color:#1e40af}
.box ul{padding-inline-start:14pt}
.check{display:flex;gap:6pt;margin-bottom:3pt}
.check b{color:#16a34a}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:14pt;margin-top:8pt}
.sign div{border:.6pt solid #94a3b8;border-radius:4pt;padding:8pt;min-height:62pt}
.note{font-size:8.5pt;color:#64748b;margin-top:4pt}
`;

type Ctx = { lang: Lang; t: (en: string, ar: string) => string; cur: string };

function head(ctx: Ctx, title: string, kind: DocKind, number: string, mark: { en: string; ar: string } = MARKS[kind]) {
  return `<div class="band"><div><div class="title">${esc(title)}</div><div class="sub">${ltr(COMPANY.name)} · ${ltr(COMPANY.website)} · ${ltr(COMPANY.phone)}</div><span class="mark ${kind}">${esc(ctx.t(mark.en, mark.ar))}</span></div><div style="text-align:end"><img alt="OSTA" src="data:image/jpeg;base64,${CONTRACT_LOGO_JPEG}"/><div class="sub">${esc(ctx.t("Agreement No.", "رقم الاتفاقية"))}: ${ltr(number)}</div></div></div>`;
}

function kv(rows: [string, string][]) {
  return `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join("")}</table>`;
}

function clausesHtml(ctx: Ctx, clauses: Clause[]) {
  return clauses.map((c, i) => `<div class="clause"><h3>${i + 1}. ${esc(ctx.t(c.titleEn, c.titleAr))}</h3>${bodyHtml(ctx.t(c.bodyEn, c.bodyAr))}</div>`).join("");
}

function pageCss(ctx: Ctx, number: string) {
  const dir = ctx.lang === "ar" ? "rtl" : "ltr";
  const left = `"${cssStr(`${COMPANY.brand} · ${COMPANY.phone}`)}"`;
  const mid = `"${cssStr(number)}"`;
  return `@page{size:A4;margin:16mm 15mm 20mm 15mm;@bottom-${dir === "rtl" ? "right" : "left"}{content:${left};direction:ltr;unicode-bidi:isolate;font:8pt "OstaDoc",sans-serif;color:#64748b}@bottom-center{content:${mid};direction:ltr;unicode-bidi:isolate;font:8pt "OstaDoc",sans-serif;color:#64748b}@bottom-${dir === "rtl" ? "left" : "right"}{content:counter(page) " / " counter(pages);direction:ltr;unicode-bidi:isolate;font:8pt "OstaDoc",sans-serif;color:#64748b}}`;
}

export function renderContractHtml(d: ContractDocInput): string {
  const { snapshot: s, lang } = d;
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const ctx: Ctx = { lang, t, cur: s.pricing.currency };
  const money = (n: number | null) => fmtMoney(n, s.pricing.currency, lang);
  const title = "OSTA – Maintenance Service Agreement";
  const pkgName = t(s.package.nameEn, s.package.nameAr);
  // An agreement activated on an approved payment arrangement (no payment received) never claims to be PAID.
  const mark = d.kind === "final" && d.paymentStatus === "arrangement" ? { en: "FINAL – ACTIVATED (APPROVED PAYMENT ARRANGEMENT)", ar: "نهائي – مفعّل (بترتيب دفع معتمد)" } : MARKS[d.kind];
  const L = lang === "ar" ? ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"] : ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  const lines = s.package.lines.map((l) => `<tr><td>${esc(t(l.serviceEn, l.serviceAr))}</td><td>${esc(t(l.quantityEn, l.quantityAr))}</td></tr>`).join("");
  const priced = s.extras.filter((e) => !e.included);
  const incl = s.extras.filter((e) => e.included);
  const extrasHtml = s.extras.length || s.openItems.length
    ? `<table><tr><th>${esc(t("Additional service", "الخدمة الإضافية"))}</th><th class="num">${esc(t("Qty", "الكمية"))}</th><th class="num">${esc(t("Unit price", "سعر الوحدة"))}</th><th class="num">${esc(t("Amount", "المبلغ"))}</th></tr>${
        priced.map((e) => `<tr><td>${esc(t(e.labelEn, e.labelAr))}</td><td class="num">${e.qty}</td><td class="num">${e.unitPrice == null ? "—" : money(e.unitPrice)}</td><td class="num">${e.amount == null ? esc(t("To be quoted", "بعرض سعر منفصل")) : money(e.amount)}</td></tr>`).join("")
      }${incl.map((e) => `<tr><td>${esc(t(e.labelEn, e.labelAr))}</td><td class="num">${e.qty}</td><td class="num">—</td><td class="num">${esc(t("Included in the package", "مشمول في الباقة"))}</td></tr>`).join("")}</table>`
    : `<p class="muted">${esc(t("No additional services were requested.", "لم يتم طلب خدمات إضافية."))}</p>`;

  const vatLabel = `${t("VAT", "ضريبة القيمة المضافة")} (${s.pricing.vatPercent}%)`;
  const vatNote = s.pricing.pricesIncludeVat
    ? t("Prices above include VAT; the VAT shown is the part contained in the total.", "الأسعار أعلاه شاملة الضريبة، والضريبة الموضحة هي الجزء المتضمن في الإجمالي.")
    : t("Prices above exclude VAT, which is added to the total.", "الأسعار أعلاه غير شاملة الضريبة، وتُضاف الضريبة إلى الإجمالي.");
  const pay = d.paymentStatus === "arrangement"
    ? t("Approved payment arrangement – payment still due", "ترتيب دفع معتمد – الدفع لا يزال مستحقاً")
    : d.paymentStatus === "paid"
    ? t(`Paid${d.paidAt ? ` on ${fmtDate(d.paidAt, lang)}` : ""}${d.paymentReference ? ` – ref. ${d.paymentReference}` : ""}`, `مدفوع${d.paidAt ? ` بتاريخ ${fmtDate(d.paidAt, lang)}` : ""}${d.paymentReference ? ` – مرجع ${d.paymentReference}` : ""}`)
    : t("Unpaid – awaiting approval and payment", "غير مدفوع – بانتظار الاعتماد والدفع");

  const pricing = `<table>
    <tr><td>${esc(t("Package price", "سعر الباقة"))}</td><td class="num">${esc(s.pricing.packagePrice == null ? t("Custom quotation", "عرض سعر مخصص") : money(s.pricing.packagePrice))}</td></tr>
    <tr><td>${esc(t("Additional services", "الخدمات الإضافية"))}</td><td class="num">${money(s.pricing.additional)}</td></tr>
    <tr><td>${esc(t("Discounts", "الخصومات"))}</td><td class="num">${s.pricing.discount ? `- ${money(s.pricing.discount)}` : "—"}</td></tr>
    <tr><td>${esc(vatLabel)}</td><td class="num">${money(s.pricing.vat)}</td></tr>
    <tr class="total"><td>${esc(t("Total contract value", "إجمالي قيمة العقد"))}</td><td class="num">${money(s.pricing.total)}</td></tr>
    <tr><td>${esc(t("Payment status", "حالة الدفع"))}</td><td class="num">${esc(pay)}</td></tr></table><p class="note">${esc(vatNote)}</p>`;

  const accepted = d.acceptedAt
    ? `${s.checks.map((c) => `<div class="check"><b>✓</b><span>${esc(t(c.en, c.ar))}</span></div>`).join("")}<p class="note">${esc(t("Accepted electronically on", "تمت الموافقة إلكترونياً بتاريخ"))} ${esc(fmtDate(d.acceptedAt, lang, true))} · ${esc(d.acceptanceMethod || t("website", "الموقع الإلكتروني"))} · ${esc(t("Terms version", "إصدار الشروط"))} ${s.terms.version}</p>`
    : `<p class="muted">${esc(t("The customer has not yet accepted this agreement.", "لم يوافق العميل على هذه الاتفاقية بعد."))}</p>`;

  const start = d.activationDate;
  const duration = kv([
    [t("Agreement term", "مدة الاتفاقية"), esc(t(`${s.package.durationMonths} months from the activation date`, `${s.package.durationMonths} شهراً من تاريخ التفعيل`))],
    [t("Activation date", "تاريخ التفعيل"), esc(start ? fmtDate(start, lang) : t("On confirmed payment", "عند تأكيد الدفع"))],
    [t("Expiry date", "تاريخ الانتهاء"), esc(d.expiryDate ? fmtDate(d.expiryDate, lang) : t("12 months after activation", "بعد 12 شهراً من التفعيل"))],
  ]);

  const sp = s.package.specialTerms;
  const special = lang === "ar" && sp.ar.length ? sp.ar : sp.en.length ? sp.en : sp.ar;
  const respTable = (party: "customer" | "company") => `<div class="box"><h4>${esc(party === "customer" ? t("The Customer", "العميل") : t("OSTA Services", "شركة OSTA"))}</h4><ul>${RESPONSIBILITIES.filter((r) => r.party === party).map((r) => `<li>${esc(t(r.en, r.ar))}</li>`).join("")}</ul></div>`;

  const pkgBlock = `${kv([
    [t("Package", "الباقة"), `<b>${esc(pkgName)}</b>`],
    [t("Agreement duration", "مدة الاتفاقية"), esc(t(`${s.package.durationMonths} months`, `${s.package.durationMonths} شهراً`))],
    [t("Annual price", "السعر السنوي"), esc(s.pricing.packagePrice == null ? t("Custom quotation", "عرض سعر مخصص") : money(s.pricing.packagePrice))],
    [t("AC units covered", "عدد المكيفات المشمولة"), esc(s.package.acUnitsCovered == null ? "—" : String(s.package.acUnitsCovered))],
    ...(s.package.handymanHours != null ? [[t("Handyman hours included", "ساعات الهاندي مان المشمولة"), esc(String(s.package.handymanHours))] as [string, string]] : []),
    [t("Visits", "عدد الزيارات"), s.package.visits.length ? s.package.visits.map((v) => esc(t(v.en, v.ar))).join("<br/>") : "—"],
  ])}`;

  const body = `
  <div class="wm ${d.kind}">${esc(t(mark.en, mark.ar))}</div>
  ${head(ctx, title, d.kind, d.number, mark)}
  <div class="sec" style="margin-top:0"><h2>${L[0]}. ${esc(t("Agreement Details", "بيانات الاتفاقية"))}</h2>${kv([
    [t("Agreement reference", "رقم الاتفاقية"), ltr(d.number)],
    [t("Request number", "رقم الطلب"), ltr(d.requestNumber)],
    [t("Agreement version", "إصدار الاتفاقية"), ltr(String(d.version))],
    [t("Creation date", "تاريخ الإنشاء"), esc(fmtDate(d.createdAt, lang))],
    [t("Service provider", "مقدم الخدمة"), ltr(COMPANY.name)],
    [t("Website", "الموقع الإلكتروني"), ltr(COMPANY.website)],
    [t("Company contact", "التواصل مع الشركة"), ltr(COMPANY.phone)],
  ])}</div>
  <div class="sec"><h2>${L[1]}. ${esc(t("Customer & Property Details", "بيانات العميل والعقار"))}</h2>${kv([
    [t("Customer name", "اسم العميل"), esc(s.customer.name)],
    [t("Phone", "رقم الهاتف"), ltr(s.customer.phone)],
    [t("Email", "البريد الإلكتروني"), ltr(s.customer.email)],
    [t("Emirate / area", "الإمارة والمنطقة"), esc([s.property.emirate, s.property.area].filter(Boolean).join(" – "))],
    [t("Full address", "العنوان الكامل"), esc(s.property.address || "—")],
    [t("Property type", "نوع العقار"), esc(s.property.type || "—")],
    [t("Bedrooms", "عدد الغرف"), esc(String(s.property.bedrooms || "—"))],
    [t("Bathrooms", "عدد الحمامات"), esc(String(s.property.bathrooms || "—"))],
    [t("Property size", "مساحة العقار"), esc(s.property.size ? `${s.property.size.toLocaleString("en-US")} ${t("sq ft", "قدم مربع")}` : "—")],
    [t("Floors", "عدد الطوابق"), esc(String(s.property.floors || "—"))],
    [t("AC units", "عدد وحدات التكييف"), esc(String(s.property.acUnits || "—"))],
    [t("Additional information", "معلومات إضافية"), esc(s.property.notes || "—")],
  ])}</div>
  <div class="sec"><h2>${L[2]}. ${esc(t("Selected Package & Services", "الباقة والخدمات المختارة"))}</h2>${pkgBlock}
    <table style="margin-top:6pt"><tr><th>${esc(t("Included service", "الخدمة المشمولة"))}</th><th>${esc(t("Quantity / limit", "الكمية / الحد"))}</th></tr>${lines || `<tr><td colspan="2">—</td></tr>`}</table>
    ${s.package.bullets.length ? `<div class="box" style="margin-top:6pt"><h4>${esc(t("Package highlights", "مزايا الباقة"))}</h4><ul>${s.package.bullets.map((b) => `<li>${esc(t(b.en, b.ar))}</li>`).join("")}</ul></div>` : ""}
    <div class="two" style="margin-top:6pt"><div class="box"><h4>${esc(t("Services not included", "الخدمات المستثناة"))}</h4>${s.package.excluded.length ? `<ul>${s.package.excluded.map((x) => `<li>${esc(t(x.en, x.ar))}</li>`).join("")}</ul>` : `<span class="muted">—</span>`}</div>
    <div class="box"><h4>${esc(t("Special notes & conditions", "ملاحظات وشروط خاصة"))}</h4>${special.length ? `<ol style="padding-inline-start:14pt">${special.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>` : `<span class="muted">—</span>`}</div></div></div>
  <div class="sec"><h2>${L[3]}. ${esc(t("Additional Services Requested", "الخدمات الإضافية المطلوبة"))}</h2>${extrasHtml}${s.openItems.length ? `<p class="note">${esc(t("Items priced by a separate quotation, approved by the customer before any work: ", "بنود تُسعَّر بعرض سعر منفصل يعتمده العميل قبل أي عمل: "))}${esc(s.openItems.map((x) => t(x.en, x.ar)).join(lang === "ar" ? "، " : ", "))}</p>` : ""}</div>
  <div class="sec"><h2>${L[4]}. ${esc(t("Financial Summary", "الملخص المالي"))}</h2>${pricing}</div>
  <div class="sec"><h2>${L[5]}. ${esc(t("Agreement Term", "مدة الاتفاقية"))}</h2>${duration}</div>
  <div class="sec"><h2>${L[6]}. ${esc(t("Terms & Conditions", "الشروط والأحكام"))}</h2><p class="note" style="margin-bottom:6pt">${esc(t(`Terms version ${s.terms.version}`, `إصدار الشروط ${s.terms.version}`))}</p>${clausesHtml(ctx, s.terms.clauses)}</div>
  <div class="sec"><h2>${L[7]}. ${esc(t("Responsibilities of the Parties", "مسؤوليات الطرفين"))}</h2><div class="two">${respTable("customer")}${respTable("company")}</div></div>
  <div class="sec"><h2>${L[8]}. ${esc(t("Customer Acknowledgement & Electronic Acceptance", "إقرار العميل والموافقة الإلكترونية"))}</h2>${accepted}
    <div class="sign"><div><b>${esc(t("Customer", "العميل"))}</b><br/>${esc(s.customer.name)}<br/><span class="muted">${esc(d.acceptedAt ? fmtDate(d.acceptedAt, lang, true) : "—")}</span></div>
    <div><b>${esc(COMPANY.brand)}</b><br/>${ltr(COMPANY.name)}<br/><span class="muted">${esc(d.approvedAt ? `${t("Approved", "تم الاعتماد")}: ${fmtDate(d.approvedAt, lang)}` : t("Pending approval", "بانتظار الاعتماد"))}</span></div></div></div>
  <div class="sec"><h2>${L[9]}. ${esc(t("Agreement Record", "سجل الاتفاقية"))}</h2>${kv([
    [t("Agreement number", "رقم الاتفاقية"), ltr(d.number)],
    [t("Agreement version", "إصدار الاتفاقية"), ltr(String(d.version))],
    [t("Issued on", "تاريخ الإصدار"), esc(fmtDate(new Date(), lang))],
    [t("Status", "الحالة"), esc(t(mark.en, mark.ar))],
  ])}</div>`;

  return `<!doctype html><html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8"/><title>${esc(title)} ${esc(d.number)}</title><style>${CSS}${pageCss(ctx, d.number)}</style></head><body>${body}</body></html>`;
}

export function renderAddendumHtml(a: AddendumDocInput): string {
  const lang = a.lang;
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const ctx: Ctx = { lang, t, cur: a.currency };
  const title = "OSTA – Contract Addendum";
  const delta = a.amountChange;
  return `<!doctype html><html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8"/><title>${esc(title)} ${esc(a.number)}</title><style>${CSS}${pageCss(ctx, a.number)}</style></head><body>
  <div class="wm final">${esc(t("CONTRACT ADDENDUM", "ملحق تعاقدي"))}</div>
  ${head(ctx, title, "final", a.number).replace(/<span class="mark final">[^<]*<\/span>/, `<span class="mark draft">${esc(t("ADDENDUM", "ملحق تعاقدي"))}</span>`)}
  <div class="sec" style="margin-top:0"><h2>${esc(t("Addendum Details", "بيانات الملحق"))}</h2>${kv([
    [t("Addendum number", "رقم الملحق"), ltr(a.number)],
    [t("Original agreement", "الاتفاقية الأصلية"), ltr(a.contractNumber)],
    [t("Issued on", "تاريخ الإصدار"), esc(fmtDate(a.issuedAt, lang))],
    [t("Customer", "العميل"), esc(a.customerName)],
    [t("Property", "العقار"), esc(a.propertyAddress || "—")],
  ])}</div>
  <div class="sec"><h2>${esc(t(a.titleEn || "Amendment", "التعديل"))}${lang === "ar" && a.titleAr ? ` – ${esc(a.titleAr)}` : ""}</h2><div class="clause">${bodyHtml(lang === "ar" ? a.bodyAr || a.bodyEn : a.bodyEn || a.bodyAr)}</div></div>
  <div class="sec"><h2>${esc(t("Change in price", "التغيير في السعر"))}</h2><table><tr><td>${esc(t("Amount added to / (deducted from) the agreement", "المبلغ المضاف إلى / (المخصوم من) الاتفاقية"))}</td><td class="num">${delta ? `${delta > 0 ? "+" : "-"} ${fmtMoney(Math.abs(delta), a.currency, lang)}` : "—"}</td></tr></table>
  <p class="note">${esc(t("All other terms of the original agreement remain unchanged. This addendum takes effect once the customer approves it.", "تبقى جميع الشروط الأخرى للاتفاقية الأصلية دون تغيير. يسري هذا الملحق بعد موافقة العميل عليه."))}</p></div>
  <div class="sec"><h2>${esc(t("Customer approval", "موافقة العميل"))}</h2><p>${a.acceptedAt ? esc(t(`Approved on ${fmtDate(a.acceptedAt, lang, true)}`, `تمت الموافقة بتاريخ ${fmtDate(a.acceptedAt, lang, true)}`)) : `<span class="muted">${esc(t("Awaiting the customer's approval.", "بانتظار موافقة العميل."))}</span>`}</p></div>
  </body></html>`;
}
