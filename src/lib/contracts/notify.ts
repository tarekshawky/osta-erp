import { emailSender, type EmailAttachment } from "@/lib/emailSender";
import { toWaPhoneDigits } from "@/lib/phone";
import { COMPANY, PAYMENT_MESSAGE, type Bi } from "./clauses";

// What the customer is told, and how. Emails go out by themselves (with the PDF attached); WhatsApp is a ready-to-send chat link the
// admin opens, because WhatsApp's business API only allows pre-approved templates.

// The website that hosts the customer's agreement page and account. Set PUBLIC_SITE_URL to change it.
export const publicBase = () => (process.env.PUBLIC_SITE_URL?.trim() || "https://osta-invoice-users.vercel.app").replace(/\/+$/, "");
export const agreementUrl = (token: string) => `${publicBase()}/agreement/${token}`;
export const accountContractsUrl = () => `${publicBase()}/agreements`;

export function whatsappLink(phone: string, text: string): string | null {
  // A usable number has the country code plus at least eight more digits; anything shorter (or not a number at all) gives no link.
  if (phone.replace(/\D/g, "").length < 8) return null;
  const digits = toWaPhoneDigits(phone);
  return digits.length >= 11 && digits.length <= 15 ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

export type MessageKind = "received" | "payment" | "final" | "changes" | "rejected" | "review" | "addendum" | "renewal";
export type MessageCtx = { lang: "en" | "ar"; customerName: string; number: string; url: string; note?: string; total?: string; packageName?: string };

const COPY: Record<MessageKind, { subject: Bi; lines: (c: MessageCtx) => Bi }> = {
  received: {
    subject: { en: "We received your maintenance agreement request", ar: "استلمنا طلب اتفاقية الصيانة الخاصة بك" },
    lines: (c) => ({
      en: `Thank you, ${c.customerName}. We received your request for ${c.packageName ?? "your package"} (agreement ${c.number}). The draft agreement is attached. Our team will review it and send you a secure payment link once it is approved.`,
      ar: `شكراً لك ${c.customerName}. استلمنا طلبك لـ ${c.packageName ?? "باقتك"} (اتفاقية رقم ${c.number}). مرفق مسودة الاتفاقية. سيراجعها فريقنا ويرسل لك رابط دفع آمن بعد اعتمادها.`,
    }),
  },
  payment: {
    subject: { en: "Your OSTA maintenance agreement is approved – payment link", ar: "تم اعتماد اتفاقية الصيانة – رابط الدفع" },
    lines: (c) => ({ en: `${PAYMENT_MESSAGE.en}${c.total ? ` Amount due: ${c.total}.` : ""}`, ar: `${PAYMENT_MESSAGE.ar}${c.total ? ` المبلغ المستحق: ${c.total}.` : ""}` }),
  },
  final: {
    subject: { en: "Your OSTA maintenance agreement is active", ar: "اتفاقية الصيانة الخاصة بك مفعّلة" },
    lines: (c) => ({
      en: `Thank you, ${c.customerName}. Your payment is confirmed and agreement ${c.number} is now active. The final agreement PDF is attached, and you can download it any time from your account.`,
      ar: `شكراً لك ${c.customerName}. تم تأكيد الدفع واتفاقية رقم ${c.number} أصبحت مفعّلة. مرفق النسخة النهائية من الاتفاقية، ويمكنك تنزيلها في أي وقت من حسابك.`,
    }),
  },
  changes: {
    subject: { en: "Changes needed on your maintenance agreement", ar: "مطلوب تعديل على اتفاقية الصيانة" },
    lines: (c) => ({ en: `We reviewed agreement ${c.number} and need a change before we can approve it: ${c.note ?? ""}`, ar: `راجعنا الاتفاقية رقم ${c.number} ونحتاج إلى تعديل قبل اعتمادها: ${c.note ?? ""}` }),
  },
  rejected: {
    subject: { en: "Update on your maintenance agreement request", ar: "بخصوص طلب اتفاقية الصيانة" },
    lines: (c) => ({ en: `We are sorry: we could not approve agreement request ${c.number}.${c.note ? ` Reason: ${c.note}` : ""} Please contact us if you would like to discuss it.`, ar: `نأسف، لم نتمكن من اعتماد طلب الاتفاقية رقم ${c.number}.${c.note ? ` السبب: ${c.note}` : ""} يرجى التواصل معنا إن رغبت في مناقشة ذلك.` }),
  },
  review: {
    subject: { en: "Please review your updated maintenance agreement", ar: "يرجى مراجعة اتفاقية الصيانة المحدّثة" },
    lines: (c) => ({ en: `Agreement ${c.number} was updated${c.note ? `: ${c.note}` : ""}. Nothing changes until you review and accept it. Please open the link below.`, ar: `تم تحديث الاتفاقية رقم ${c.number}${c.note ? `: ${c.note}` : ""}. لن يتغير شيء قبل مراجعتك وموافقتك. يرجى فتح الرابط أدناه.` }),
  },
  addendum: {
    subject: { en: "A contract addendum for your maintenance agreement", ar: "ملحق تعاقدي لاتفاقية الصيانة" },
    lines: (c) => ({ en: `An addendum to agreement ${c.number} has been issued${c.note ? `: ${c.note}` : ""}. The PDF is attached.`, ar: `تم إصدار ملحق للاتفاقية رقم ${c.number}${c.note ? `: ${c.note}` : ""}. مرفق ملف PDF.` }),
  },
  renewal: {
    subject: { en: "Renew your OSTA maintenance agreement", ar: "جدّد اتفاقية الصيانة الخاصة بك" },
    lines: (c) => ({ en: `Your agreement is due for renewal. A renewal agreement ${c.number} is ready for you to review and accept using the link below.`, ar: `حان موعد تجديد اتفاقيتك. اتفاقية التجديد رقم ${c.number} جاهزة لمراجعتك وموافقتك عبر الرابط أدناه.` }),
  },
};

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// The same message in both languages (the customer's own language first).
export function composeMessage(kind: MessageKind, c: MessageCtx) {
  const copy = COPY[kind];
  const first = c.lang === "ar" ? "ar" : "en";
  const second = first === "ar" ? "en" : "ar";
  const body = copy.lines(c);
  const subject = `${copy.subject[first]} | ${copy.subject[second]}`;
  const showLink = kind !== "rejected" && kind !== "final" && kind !== "addendum";
  const plain = [body[first], ...(showLink ? [c.url] : []), "", body[second]].join("\n");
  const block = (lang: "en" | "ar") => `<div dir="${lang === "ar" ? "rtl" : "ltr"}" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.7;color:#0f172a">${esc(body[lang])}</div>`;
  const html = `<div style="max-width:560px;margin:auto;padding:20px;border:1px solid #e2e8f0;border-radius:10px">
<div style="font-weight:700;font-size:17px;color:#1e5bd8;margin-bottom:10px">${esc(COMPANY.brand)}</div>${block(first)}${showLink ? `<p style="text-align:center;margin:18px 0"><a href="${esc(c.url)}" style="background:#1e5bd8;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:700">${first === "ar" ? "فتح الاتفاقية" : "Open the agreement"}</a></p>` : ""}
<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>${block(second)}
<p style="color:#64748b;font-size:12px;margin-top:16px">${esc(COMPANY.name)} · ${esc(COMPANY.website)} · ${esc(COMPANY.phone)}</p></div>`;
  return { subject, text: plain, html, whatsapp: plain };
}

export async function sendCustomerEmail(to: string, kind: MessageKind, ctx: MessageCtx, attachments: EmailAttachment[] = []) {
  const m = composeMessage(kind, ctx);
  // adminCopy: false -- the admin is told about requests separately; a customer message is for the customer.
  await emailSender.send({ subject: m.subject, html: m.html, text: m.text, to: [to], adminCopy: false, attachments });
}
