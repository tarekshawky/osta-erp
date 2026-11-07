// Pluggable admin-notification email delivery (new customer signups, new service
// bookings). This is the ONE file to touch to go live: set RESEND_API_KEY and
// ADMIN_NOTIFICATION_EMAIL. Until then, notifications are only logged to the server
// console -- no real email is sent.
//
// Note on Resend's sandbox mode: until you verify a sending domain in the Resend
// dashboard, you can only send FROM the shared onboarding@resend.dev address, and
// only TO the email address that owns the Resend account. Verify a domain (Resend
// dashboard -> Domains) to notify any admin address and use a custom From address.
export interface EmailSender {
  // adminCopy (default true): the admin address also gets the message. Mail meant only for a customer, such as a password reset
  // link, sets it to false.
  send(params: { subject: string; html: string; text: string; to?: string[]; adminCopy?: boolean; attachments?: EmailAttachment[] }): Promise<void>;
}

// A file sent with the email (for example the agreement PDF).
export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

class ConsoleEmailSender implements EmailSender {
  async send({ subject, text, to, attachments }: { subject: string; html: string; text: string; to?: string[]; adminCopy?: boolean; attachments?: EmailAttachment[] }) {
    console.log(`[EMAIL to ${to?.length ? to.join(", ") : "admin"}] ${subject}${attachments?.length ? ` (+${attachments.length} attachment)` : ""}\n${text}`);
  }
}

class ResendEmailSender implements EmailSender {
  async send({ subject, html, text, to: extra, adminCopy = true, attachments }: { subject: string; html: string; text: string; to?: string[]; adminCopy?: boolean; attachments?: EmailAttachment[] }) {
    const apiKey = process.env.RESEND_API_KEY!;
    // The admin address always gets a copy; a form can add its own recipients.
    const to = [...new Set([...(adminCopy ? [process.env.ADMIN_NOTIFICATION_EMAIL!] : []), ...(extra ?? [])])];
    if (to.length === 0) return;
    const from = process.env.RESEND_FROM_EMAIL || "OSTA Services <onboarding@resend.dev>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text, ...(attachments?.length ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) } : {}) }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend email send failed (${res.status}): ${detail}`);
    }
  }
}

const hasResendConfig = !!process.env.RESEND_API_KEY && !!process.env.ADMIN_NOTIFICATION_EMAIL;

// True when emails are really delivered (otherwise they are only logged on the server).
export const emailDeliveryConfigured = hasResendConfig;

export const emailSender: EmailSender = hasResendConfig ? new ResendEmailSender() : new ConsoleEmailSender();

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderRows(rows: [string, string][]) {
  const html = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#5c6d90;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:4px 0;color:#0b1730;font-size:13px;font-weight:600;">${escapeHtml(value)}</td></tr>`
    )
    .join("");
  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  return { html: `<table cellpadding="0" cellspacing="0">${html}</table>`, text };
}

// Sent right after a customer self-registers via POST /auth/signup.
export async function notifyAdminOfSignup(params: { name: string; phone: string; email: string; emirate: string }) {
  const { html, text } = renderRows([
    ["Name", params.name],
    ["Phone", params.phone],
    ["Email", params.email],
    ["Emirate", params.emirate],
  ]);
  await emailSender.send({
    subject: `New customer signup: ${params.name}`,
    html: `<h2>New customer signed up</h2>${html}`,
    text: `New customer signed up\n\n${text}`,
  });
}

// Sent right after a customer books a service via POST /orders.
export async function notifyAdminOfBooking(params: {
  orderNumber: string;
  customerName: string;
  phone: string;
  location: string;
  service: string;
  scheduledAt: string;
}) {
  const { html, text } = renderRows([
    ["Order", params.orderNumber],
    ["Customer", params.customerName],
    ["Phone", params.phone],
    ["Service", params.service],
    ["Location", params.location],
    ["Scheduled", params.scheduledAt],
  ]);
  await emailSender.send({
    subject: `New booking: ${params.service} — ${params.customerName}`,
    html: `<h2>New service booking</h2>${html}`,
    text: `New service booking\n\n${text}`,
  });
}

// Sent when a website form is submitted. Field values are visitor-supplied, so they are HTML-escaped.
export async function notifyFormSubmission(params: { formName: string; rows: [string, string][]; to?: string[]; sourcePath?: string | null }) {
  const { html, text } = renderRows([...params.rows, ...(params.sourcePath ? ([["Page", params.sourcePath]] as [string, string][]) : [])]);
  await emailSender.send({
    to: params.to,
    subject: `New lead: ${params.formName}`,
    html: `<h2>New website lead — ${escapeHtml(params.formName)}</h2>${html}`,
    text: `New website lead — ${params.formName}\n\n${text}`,
  });
}

// Sent right after a visitor asks to subscribe to an annual maintenance package.
export async function notifyAdminOfMaintenanceSubscription(params: {
  packageName: string; price: number | null; kind?: string; company?: string; message?: string; name: string; phone: string; email: string; emirate: string; location: string;
  propertyType: string; bedrooms: number; acUnits: number; activationDate: string;
}) {
  const quote = params.kind === "quote";
  const { html, text } = renderRows([
    ["Type", quote ? "Request a quote" : "Subscription"],
    ["Package", `${params.packageName} (${params.price == null ? "custom quotation" : `AED ${params.price.toLocaleString("en-US")}/year`})`],
    ...(params.company ? ([["Company", params.company]] as [string, string][]) : []),
    ["Name", params.name],
    ["Phone", params.phone],
    ["Email", params.email],
    ["Emirate", params.emirate],
    ["Location", params.location || "-"],
    ["Property", [params.propertyType, params.bedrooms ? `${params.bedrooms} bedroom(s)` : "", params.acUnits ? `${params.acUnits} AC units` : ""].filter(Boolean).join(", ") || "-"],
    ["Preferred start", params.activationDate || "-"],
    ...(params.message ? ([["Message", params.message]] as [string, string][]) : []),
  ]);
  await emailSender.send({
    subject: `New maintenance ${quote ? "quote request" : "package request"}: ${params.packageName} — ${params.name}`,
    html: `<h2>New maintenance ${quote ? "quote request" : "package request"}</h2>${html}`,
    text: `New maintenance ${quote ? "quote request" : "package request"}\n\n${text}`,
  });
}
