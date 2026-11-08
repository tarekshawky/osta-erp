import { emailSender, type EmailAttachment } from "@/lib/emailSender";
import { COMPANY } from "@/lib/contracts/clauses";
import { publicBase, whatsappLink } from "@/lib/contracts/notify";
import type { Bi } from "./config";

// What the customer and the team are told about a quotation. The customer's own language comes first, the other follows.

export const quoteUrl = (token: string, path = "quote") => `${publicBase()}/${path}/${token}`;

export type QuoteMessageKind = "generated" | "sent" | "accepted" | "rejected";
// `product` is set for a quotation that is not an AC installation one (the ductwork calculator).
export type QuoteMessageCtx = { lang: "en" | "ar"; name: string; number: string; url: string; total?: string; note?: string; product?: Bi; variant?: "duct" | "split" };

const COPY: Record<QuoteMessageKind, { subject: (c: QuoteMessageCtx) => Bi; lines: (c: QuoteMessageCtx) => Bi; link: boolean }> = {
  generated: {
    subject: (c) => (c.product ? { en: `Your ${c.product.en} quotation`, ar: `عرض سعر ${c.product.ar} الخاص بك` } : { en: "Your AC installation quotation", ar: "عرض سعر تركيب المكيفات الخاص بك" }),
    lines: (c) => (c.variant === "duct"
      ? { en: `Hello ${c.name}, your quotation ${c.number}${c.total ? ` (${c.total} including VAT)` : ""} is attached. It is an estimate, subject to technical review and final site measurement. You can open it, change it, or ask for a site inspection or the final quotation from the link below.`, ar: `مرحباً ${c.name}، مرفق عرض السعر رقم ${c.number}${c.total ? ` (${c.total} شامل الضريبة)` : ""}. وهو تقديري ويخضع للمراجعة الفنية والقياسات النهائية بالموقع. يمكنك فتحه أو تعديله أو طلب معاينة الموقع أو عرض السعر النهائي من الرابط أدناه.` }
      : { en: `Hello ${c.name}, your quotation ${c.number}${c.total ? ` (${c.total} including VAT)` : ""} is attached. It is an estimate, subject to site inspection. You can open it, change it or send it to OSTA from the link below.`, ar: `مرحباً ${c.name}، مرفق عرض السعر رقم ${c.number}${c.total ? ` (${c.total} شامل الضريبة)` : ""}. وهو تقديري ويخضع لمعاينة الموقع. يمكنك فتحه أو تعديله أو إرساله إلى اسطا من الرابط أدناه.` }),
    link: true,
  },
  sent: {
    subject: () => ({ en: "Your quotation from OSTA", ar: "عرض السعر من اسطا" }),
    lines: (c) => ({ en: `Hello ${c.name}, our team has reviewed quotation ${c.number}${c.total ? ` (${c.total} including VAT)` : ""}${c.note ? `: ${c.note}` : "."} The PDF is attached.`, ar: `مرحباً ${c.name}، راجع فريقنا عرض السعر رقم ${c.number}${c.total ? ` (${c.total} شامل الضريبة)` : ""}${c.note ? `: ${c.note}` : "."} مرفق ملف PDF.` }),
    link: true,
  },
  accepted: {
    subject: () => ({ en: "Your quotation is approved", ar: "تم اعتماد عرض السعر" }),
    lines: (c) => (c.variant === "duct"
      ? { en: `Hello ${c.name}, quotation ${c.number} has been approved. Our team will contact you to agree the next steps.`, ar: `مرحباً ${c.name}، تم اعتماد عرض السعر رقم ${c.number}. سيتواصل معك فريقنا للاتفاق على الخطوات التالية.` }
      : { en: `Hello ${c.name}, quotation ${c.number} has been approved. Our team will contact you to confirm the installation appointment.`, ar: `مرحباً ${c.name}، تم اعتماد عرض السعر رقم ${c.number}. سيتواصل معك فريقنا لتأكيد موعد التركيب.` }),
    link: false,
  },
  rejected: {
    subject: () => ({ en: "Update on your quotation", ar: "بخصوص عرض السعر" }),
    lines: (c) => ({ en: `Hello ${c.name}, we could not go ahead with quotation ${c.number}.${c.note ? ` ${c.note}` : ""} Please contact us if you would like to discuss it.`, ar: `مرحباً ${c.name}، لم نتمكن من المضي في عرض السعر رقم ${c.number}.${c.note ? ` ${c.note}` : ""} يرجى التواصل معنا إن رغبت في مناقشته.` }),
    link: false,
  },
};

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function composeQuoteMessage(kind: QuoteMessageKind, c: QuoteMessageCtx) {
  const copy = COPY[kind];
  const first = c.lang === "ar" ? "ar" : "en";
  const second = first === "ar" ? "en" : "ar";
  const body = copy.lines(c);
  const subject = copy.subject(c);
  const plain = [body[first], ...(copy.link ? [c.url] : []), "", body[second]].join("\n");
  const block = (lang: "en" | "ar") => `<div dir="${lang === "ar" ? "rtl" : "ltr"}" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.7;color:#0f172a">${esc(body[lang])}</div>`;
  const html = `<div style="max-width:560px;margin:auto;padding:20px;border:1px solid #e2e8f0;border-radius:10px"><div style="font-weight:700;font-size:17px;color:#1e5bd8;margin-bottom:10px">${esc(COMPANY.brand)}</div>${block(first)}${copy.link ? `<p style="text-align:center;margin:18px 0"><a href="${esc(c.url)}" style="background:#1e5bd8;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:700">${first === "ar" ? "فتح عرض السعر" : "Open the quotation"}</a></p>` : ""}<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>${block(second)}<p style="color:#64748b;font-size:12px;margin-top:16px">${esc(COMPANY.name)} · ${esc(COMPANY.website)} · ${esc(COMPANY.phone)}</p></div>`;
  return { subject: `${subject[first]} | ${subject[second]}`, text: plain, html, whatsapp: plain };
}

export async function sendCustomerQuoteEmail(to: string, kind: QuoteMessageKind, ctx: QuoteMessageCtx, attachments: EmailAttachment[] = []) {
  const m = composeQuoteMessage(kind, ctx);
  await emailSender.send({ subject: m.subject, html: m.html, text: m.text, to: [to], adminCopy: false, attachments });
}

export const quoteWhatsAppLink = (phone: string, kind: QuoteMessageKind, ctx: QuoteMessageCtx) => whatsappLink(phone, composeQuoteMessage(kind, ctx).whatsapp);

// The team is told when a customer sends a quotation or asks to book.
// `label` replaces the generic heading for a request that is neither a booking nor a plain "sent" (the ductwork requests).
export async function notifyAdminOfQuote(p: { number: string; version: number; booking: boolean; label?: string; name: string; phone: string; email: string; emirate: string; location: string; total: string; rfq: boolean; summary: string; adminUrl?: string }) {
  const rows: [string, string][] = [["Quotation", `${p.number} (v${p.version})`], ["Request", p.label ?? (p.booking ? "Booking request" : "Quotation sent to OSTA")], ["Customer", p.name], ["Phone", p.phone], ["Email", p.email || "-"], ["Where", `${p.emirate}${p.location ? ` — ${p.location}` : ""}`], ["Total (incl. VAT)", p.total + (p.rfq ? " + items to be quoted" : "")], ["Items", p.summary]];
  const html = `<h2>${p.label ?? (p.booking ? "New installation booking request" : "A customer sent a quotation")}</h2><table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#64748b">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join("")}</table>${p.adminUrl ? `<p><a href="${esc(p.adminUrl)}">Open in the dashboard</a></p>` : ""}`;
  await emailSender.send({ subject: `${p.label ?? (p.booking ? "Installation booking request" : "Quotation sent")}: ${p.number} — ${p.name}`, html, text: rows.map(([k, v]) => `${k}: ${v}`).join("\n") });
}
