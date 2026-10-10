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
  send(params: { subject: string; html: string; text: string }): Promise<void>;
}

class ConsoleEmailSender implements EmailSender {
  async send({ subject, text }: { subject: string; html: string; text: string }) {
    console.log(`[EMAIL to admin] ${subject}\n${text}`);
  }
}

class ResendEmailSender implements EmailSender {
  async send({ subject, html, text }: { subject: string; html: string; text: string }) {
    const apiKey = process.env.RESEND_API_KEY!;
    const to = process.env.ADMIN_NOTIFICATION_EMAIL!;
    const from = process.env.RESEND_FROM_EMAIL || "OSTA Services <onboarding@resend.dev>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend email send failed (${res.status}): ${detail}`);
    }
  }
}

const hasResendConfig = !!process.env.RESEND_API_KEY && !!process.env.ADMIN_NOTIFICATION_EMAIL;

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
