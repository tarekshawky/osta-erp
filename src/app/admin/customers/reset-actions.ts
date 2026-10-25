"use server";

import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { writeAudit } from "@/lib/adminGuard";
import { emailDeliveryConfigured, emailSender } from "@/lib/emailSender";
import { newResetToken, resetUrl } from "@/lib/passwordReset";
import { toWaPhoneDigits } from "@/lib/phone";

export type ResetLinkResult = { ok: boolean; error?: string; url?: string; emailed?: boolean; emailConfigured?: boolean; whatsappUrl?: string };

// For a customer who forgot their password: makes a one-time link (valid 48 hours) to the customer app's reset page.
// Older open links for the customer stop working. The admin can email it (when email delivery is set up), or copy it /
// send it by WhatsApp. Nothing about the customer's current password is revealed or changed until they use the link.
export async function createPasswordResetLink(customerId: string, sendEmail: boolean): Promise<ResetLinkResult> {
  const admin = await requireEmployee("ADMIN");
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true, email: true, phone: true, whatsapp: true, language: true } });
  if (!customer) return { ok: false, error: "Customer not found." };
  if (!customer.email) return { ok: false, error: "This customer has no email. The customer app logs in with an email, so add one in Edit Customer first." };

  const base = process.env.SITE_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  if (!base) return { ok: false, error: "Set the SITE_URL environment variable (the customer site address) to create reset links." };

  const { token, hash, expiresAt } = newResetToken();
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({ where: { customerId, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.create({ data: { customerId, tokenHash: hash, expiresAt, createdById: admin.id } }),
  ]);
  const url = resetUrl(base, token);

  let emailed = false;
  if (sendEmail && emailDeliveryConfigured) {
    const ar = customer.language === "Arabic";
    const subject = ar ? "إعادة تعيين كلمة المرور - خدمات أسطا" : "Reset your OSTA Services password";
    const text = ar
      ? `مرحباً ${customer.name}،\nاستخدم هذا الرابط لتعيين كلمة مرور جديدة (صالح ٤٨ ساعة):\n${url}`
      : `Hello ${customer.name},\nUse this link to set a new password (valid for 48 hours):\n${url}`;
    try {
      await emailSender.send({ subject, text, html: `<p>${text.replace(/\n/g, "<br>").replace(url, `<a href="${url}">${url}</a>`)}</p>`, to: [customer.email] });
      emailed = true;
    } catch {
      emailed = false; // the link is still shown so the admin can send it another way
    }
  }

  const waText = customer.language === "Arabic" ? `مرحباً ${customer.name}، رابط تعيين كلمة مرور جديدة لحسابك في خدمات أسطا (صالح ٤٨ ساعة): ${url}` : `Hello ${customer.name}, here is the link to set a new password for your OSTA Services account (valid 48 hours): ${url}`;
  const whatsappUrl = `https://wa.me/${toWaPhoneDigits(customer.whatsapp || customer.phone)}?text=${encodeURIComponent(waText)}`;
  await writeAudit(admin, "customer.password-reset-link", "Customer", customerId, null, { emailed, expiresAt: expiresAt.toISOString() });
  return { ok: true, url, emailed, emailConfigured: emailDeliveryConfigured, whatsappUrl };
}
