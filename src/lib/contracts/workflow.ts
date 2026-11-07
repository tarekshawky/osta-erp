import type { Bi } from "./clauses";

// The life of an agreement, and what each person may do at each step. Kept free of the database so the rules can be tested.

export const CONTRACT_STATUSES = ["DRAFT", "PENDING_APPROVAL", "CHANGES_REQUESTED", "AWAITING_PAYMENT", "ACTIVE", "CANCELLED", "REJECTED"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];
// An active agreement whose end date has passed.
export type DisplayStatus = ContractStatus | "EXPIRED";

export const STATUS_LABEL: Record<DisplayStatus, Bi> = {
  DRAFT: { en: "Draft – awaiting customer", ar: "مسودة – بانتظار العميل" },
  PENDING_APPROVAL: { en: "Pending approval", ar: "بانتظار الاعتماد" },
  CHANGES_REQUESTED: { en: "Changes requested", ar: "مطلوب تعديل" },
  AWAITING_PAYMENT: { en: "Awaiting payment", ar: "بانتظار الدفع" },
  ACTIVE: { en: "Contract activated", ar: "العقد مفعّل" },
  EXPIRED: { en: "Expired", ar: "منتهي" },
  CANCELLED: { en: "Cancelled", ar: "ملغي" },
  REJECTED: { en: "Rejected", ar: "مرفوض" },
};

// The label of the matching step on the subscription request itself (the status list the admin already knows).
export const REQUEST_STATUS_OF: Record<ContractStatus, string> = {
  DRAFT: "Quotation Sent",
  PENDING_APPROVAL: "Under Review",
  CHANGES_REQUESTED: "Under Review",
  AWAITING_PAYMENT: "Payment Pending",
  ACTIVE: "Contract Activated",
  CANCELLED: "Rejected",
  REJECTED: "Rejected",
};

export const TABS = [
  { key: "all", label: "All Contracts" },
  { key: "draft", label: "Draft Agreements" },
  { key: "pending", label: "Pending Approval" },
  { key: "payment", label: "Awaiting Payment" },
  { key: "active", label: "Active Contracts" },
  { key: "expired", label: "Expired Contracts" },
  { key: "cancelled", label: "Cancelled Contracts" },
  { key: "rejected", label: "Rejected Requests" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];

export function displayStatus(c: { status: string; expiryDate: Date | null }, now = new Date()): DisplayStatus {
  const s = (CONTRACT_STATUSES as readonly string[]).includes(c.status) ? (c.status as ContractStatus) : "PENDING_APPROVAL";
  return s === "ACTIVE" && c.expiryDate && c.expiryDate.getTime() < now.getTime() ? "EXPIRED" : s;
}

export function tabOf(c: { status: string; expiryDate: Date | null }, now = new Date()): Exclude<TabKey, "all"> {
  switch (displayStatus(c, now)) {
    case "DRAFT": return "draft";
    case "PENDING_APPROVAL":
    case "CHANGES_REQUESTED": return "pending";
    case "AWAITING_PAYMENT": return "payment";
    case "ACTIVE": return "active";
    case "EXPIRED": return "expired";
    case "CANCELLED": return "cancelled";
    case "REJECTED": return "rejected";
  }
}

export type ContractAction =
  | "approve" | "requestChanges" | "revise" | "reject" | "recordPayment" | "cancel" | "renew" | "addendum"
  | "resendAgreement" | "resendPaymentLink" | "regeneratePdf" | "note";

// What the admin may do now. Payment can only be recorded after approval, and an agreement is activated only by a recorded payment.
export function allowedActions(c: { status: string; expiryDate: Date | null }, now = new Date()): Set<ContractAction> {
  const out = new Set<ContractAction>(["note"]);
  const s = displayStatus(c, now);
  if (s === "DRAFT") ["revise", "resendAgreement", "cancel", "regeneratePdf"].forEach((a) => out.add(a as ContractAction));
  if (s === "PENDING_APPROVAL") ["approve", "requestChanges", "revise", "reject", "cancel", "regeneratePdf"].forEach((a) => out.add(a as ContractAction));
  if (s === "CHANGES_REQUESTED") ["approve", "revise", "reject", "cancel", "resendAgreement", "regeneratePdf"].forEach((a) => out.add(a as ContractAction));
  if (s === "AWAITING_PAYMENT") ["recordPayment", "resendPaymentLink", "revise", "reject", "cancel", "regeneratePdf"].forEach((a) => out.add(a as ContractAction));
  if (s === "ACTIVE") ["addendum", "cancel", "regeneratePdf", "resendAgreement"].forEach((a) => out.add(a as ContractAction));
  if (s === "EXPIRED") ["renew", "regeneratePdf"].forEach((a) => out.add(a as ContractAction));
  if (s === "ACTIVE") out.add("renew");
  return out;
}

export const PAYMENT_METHODS = ["Bank transfer", "Cash", "Card / payment link", "Cheque", "Approved alternative arrangement"] as const;
export const ALTERNATIVE_ARRANGEMENT = "Approved alternative arrangement";

export type PaymentProblem = string | null;
// An authorized admin may activate without a gateway payment only by explicitly recording an approved arrangement, with the details.
export function paymentProblem(p: { method: string; reference: string; note: string }): PaymentProblem {
  if (!(PAYMENT_METHODS as readonly string[]).includes(p.method)) return "Choose how the payment was received.";
  if (p.method === ALTERNATIVE_ARRANGEMENT) return p.note.trim().length >= 10 ? null : "Describe the approved payment arrangement (who approved it and the terms).";
  return p.reference.trim().length >= 2 ? null : "Enter the payment reference (transaction, transfer or receipt number).";
}

// Agreement validity: the term starts at activation and runs for the stated number of months.
export function expiryFrom(activation: Date, months: number): Date {
  const d = new Date(activation);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
