// The life of a self-service quotation, and who may do what at each step. Free of the database so the rules can be tested.

export const QUOTE_STATUSES = ["Draft", "Generated", "Submitted", "Under Review", "Site Inspection Required", "Revised", "Sent", "Accepted", "Rejected", "Expired", "Converted to Order", "Under Technical Review", "Converted to Project"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

// A quotation that nobody has accepted or rejected becomes "Expired" once its validity has passed (worked out, never stored).
const NEVER_EXPIRES = new Set<string>(["Accepted", "Rejected", "Converted to Order", "Converted to Project", "Expired"]);
export function displayStatus(q: { status: string; expiresAt: Date }, now = new Date()): QuoteStatus {
  const s = (QUOTE_STATUSES as readonly string[]).includes(q.status) ? (q.status as QuoteStatus) : "Generated";
  return !NEVER_EXPIRES.has(s) && q.expiresAt.getTime() < now.getTime() ? "Expired" : s;
}

// What the administrator may move a quotation to by hand. (Revising a quotation and converting it to an order have their own actions.)
export const ADMIN_NEXT: Record<QuoteStatus, QuoteStatus[]> = {
  Draft: ["Generated", "Under Review", "Rejected"],
  Generated: ["Under Review", "Site Inspection Required", "Sent", "Accepted", "Rejected"],
  Submitted: ["Under Review", "Site Inspection Required", "Sent", "Accepted", "Rejected"],
  "Under Review": ["Site Inspection Required", "Sent", "Accepted", "Rejected"],
  "Site Inspection Required": ["Under Review", "Sent", "Accepted", "Rejected"],
  Revised: ["Under Review", "Site Inspection Required", "Sent", "Accepted", "Rejected"],
  Sent: ["Under Review", "Accepted", "Rejected"],
  Accepted: ["Rejected"],
  Rejected: ["Under Review"],
  Expired: ["Under Review"],
  "Converted to Order": [],
  // The ductwork calculator calls the review step "Under Technical Review" and the end of the road "Converted to Project".
  "Under Technical Review": ["Site Inspection Required", "Sent", "Accepted", "Rejected"],
  "Converted to Project": [],
};

export type QuoteKind = "ac-install" | "ductwork";
// What the administrator may move a quotation to, for the calculator it came from.
export function adminNextFor(kind: string, status: QuoteStatus): QuoteStatus[] {
  const review: QuoteStatus = kind === "ductwork" ? "Under Technical Review" : "Under Review";
  const from = status === "Under Technical Review" ? "Under Review" : status;
  return (ADMIN_NEXT[from] ?? []).map((x) => (x === "Under Review" ? review : x));
}
const AC_ORDER: QuoteStatus[] = ["Draft", "Generated", "Submitted", "Under Review", "Site Inspection Required", "Revised", "Sent", "Accepted", "Rejected", "Expired", "Converted to Order"];
const DUCT_ORDER: QuoteStatus[] = ["Draft", "Generated", "Submitted", "Under Technical Review", "Site Inspection Required", "Revised", "Sent", "Accepted", "Rejected", "Expired", "Converted to Project"];
// The statuses of one calculator, in the order they are listed.
export const orderedStatuses = (kind: string): QuoteStatus[] => (kind === "ductwork" ? DUCT_ORDER : AC_ORDER);

// The customer's own buttons.
export const customerCanEdit = (status: QuoteStatus, manual: boolean) => !manual && ["Generated", "Submitted", "Sent", "Expired"].includes(status);
export const customerCanSubmit = (status: QuoteStatus) => ["Generated", "Sent"].includes(status);
// A revision by the administrator can be made until the quotation has become an order.
export const adminCanRevise = (status: QuoteStatus) => status !== "Converted to Order" && status !== "Converted to Project";
// Only an accepted quotation can become a service order: nothing is booked before the administration approves it.
export const canConvert = (status: QuoteStatus) => status === "Accepted";

export const STATUS_TONE: Record<QuoteStatus, string> = {
  Draft: "bg-slate-100 text-slate-700", Generated: "bg-sky-100 text-sky-800", Submitted: "bg-amber-100 text-amber-800", "Under Review": "bg-violet-100 text-violet-800",
  "Site Inspection Required": "bg-orange-100 text-orange-800", Revised: "bg-indigo-100 text-indigo-800", Sent: "bg-blue-100 text-blue-800", Accepted: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-700", Expired: "bg-zinc-200 text-zinc-700", "Converted to Order": "bg-teal-100 text-teal-800",
  "Under Technical Review": "bg-violet-100 text-violet-800", "Converted to Project": "bg-teal-100 text-teal-800",
};

export const STATUS_AR: Record<QuoteStatus, string> = {
  Draft: "مسودة", Generated: "تم الإنشاء", Submitted: "تم الإرسال إلى اسطا", "Under Review": "قيد المراجعة", "Site Inspection Required": "مطلوب معاينة الموقع", Revised: "نسخة معدّلة",
  Sent: "تم إرساله إليك", Accepted: "مقبول", Rejected: "مرفوض", Expired: "منتهي الصلاحية", "Converted to Order": "تم تحويله إلى طلب خدمة",
  "Under Technical Review": "قيد المراجعة الفنية", "Converted to Project": "تم تحويله إلى مشروع",
};
