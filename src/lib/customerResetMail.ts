import { emailSender } from "@/lib/emailSender";

// The e-mail a customer gets after asking for a new password. It goes to the customer only (never copied to the admin: the
// link would let anyone who sees it take over the account).
export async function sendCustomerResetLink(customer: { name: string; email: string; language: string }, url: string, validMinutes: number): Promise<void> {
  const ar = customer.language === "Arabic";
  const subject = ar ? "إعادة تعيين كلمة المرور - خدمات أسطا" : "Reset your OSTA Services password";
  const text = ar
    ? `مرحباً ${customer.name}،\nطلبتَ تعيين كلمة مرور جديدة. استخدم هذا الرابط (صالح ${validMinutes} دقيقة):\n${url}\nإذا لم تطلب ذلك فتجاهل هذه الرسالة، ولن يتغير شيء في حسابك.`
    : `Hello ${customer.name},\nYou asked to set a new password. Use this link (valid for ${validMinutes} minutes):\n${url}\nIf you did not ask for this, ignore this message and nothing changes on your account.`;
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const html = `<p dir="${ar ? "rtl" : "ltr"}">${esc(text).replace(/\n/g, "<br>").replace(esc(url), `<a href="${esc(url)}">${esc(url)}</a>`)}</p>`;
  await emailSender.send({ subject, html, text, to: [customer.email], adminCopy: false });
}
