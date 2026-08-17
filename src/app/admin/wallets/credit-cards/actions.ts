"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { CREDIT_CARD_STATUSES, maskCardNumber } from "@/lib/creditCardData";

export type CreditCardFormInput = {
  name: string;
  lastFour: string;
  creditLimit: number;
  billingCycle: string;
  paymentDueDate: string;
  cardHolder: string;
  status: string;
  notes: string;
};

export type CreditCardActionResult = { ok: boolean; id?: string; error?: string };

function validate(input: CreditCardFormInput) {
  if (!input.name.trim()) return "Card Name is required.";
  if (!/^\d{4}$/.test(input.lastFour)) return "Enter a valid card number (last 4 digits must be numeric).";
  if (!(input.creditLimit > 0)) return "Credit Limit must be greater than 0.";
  if (!(CREDIT_CARD_STATUSES as readonly string[]).includes(input.status)) return "Invalid status.";
  return null;
}

function parseDueDate(value: string): number | null {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

export async function createCreditCard(input: CreditCardFormInput): Promise<CreditCardActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const [card] = await prisma.$transaction(async (tx) => {
    const created = await tx.creditCard.create({
      data: {
        name: input.name.trim(),
        lastFour: input.lastFour,
        creditLimit: input.creditLimit,
        billingCycle: input.billingCycle.trim() || null,
        paymentDueDate: parseDueDate(input.paymentDueDate),
        cardHolder: input.cardHolder.trim() || null,
        status: input.status,
        notes: input.notes.trim() || null,
        createdById: admin.id,
      },
    });
    await tx.creditCardAuditLog.create({
      data: {
        creditCardId: created.id,
        action: "Card Created",
        description: `${created.name} ${maskCardNumber(created.lastFour)} added, limit AED ${created.creditLimit.toLocaleString()}`,
        performedById: admin.id,
      },
    });
    return [created];
  });

  revalidatePath("/admin/wallets");
  return { ok: true, id: card.id };
}

export async function updateCreditCard(cardId: string, input: CreditCardFormInput): Promise<CreditCardActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.creditCard.findUnique({ where: { id: cardId } });
  if (!existing) return { ok: false, error: "Credit card not found." };

  await prisma.$transaction([
    prisma.creditCard.update({
      where: { id: cardId },
      data: {
        name: input.name.trim(),
        lastFour: input.lastFour,
        creditLimit: input.creditLimit,
        billingCycle: input.billingCycle.trim() || null,
        paymentDueDate: parseDueDate(input.paymentDueDate),
        cardHolder: input.cardHolder.trim() || null,
        status: input.status,
        notes: input.notes.trim() || null,
      },
    }),
    prisma.creditCardAuditLog.create({
      data: {
        creditCardId: cardId,
        action: "Card Updated",
        description: `${input.name.trim()} ${maskCardNumber(input.lastFour)} updated`,
        oldValue: `Limit AED ${existing.creditLimit.toLocaleString()}, ${existing.status}`,
        newValue: `Limit AED ${input.creditLimit.toLocaleString()}, ${input.status}`,
        performedById: admin.id,
      },
    }),
  ]);

  revalidatePath("/admin/wallets");
  revalidatePath(`/admin/wallets/credit-cards/${cardId}`);
  return { ok: true, id: cardId };
}
