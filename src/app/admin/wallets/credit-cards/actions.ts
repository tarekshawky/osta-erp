"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { CREDIT_CARD_STATUSES, CREDIT_CARD_PAYMENT_METHODS, maskCardNumber } from "@/lib/creditCardData";
import { formatAed } from "@/lib/format";

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

export type RecordCreditCardPaymentInput = {
  date: string;
  amount: number;
  paymentMethod: string;
  bankAccount: string;
  referenceNumber: string;
  notes: string;
};

export type RecordCreditCardPaymentResult = { ok: boolean; error?: string };

// Deliberately only ever writes CreditCardPayment + an audit log row -- never
// touches prisma.expense. This is what structurally guarantees a settlement
// payment can never be recorded as a second Expense (no double counting).
export async function recordCreditCardPayment(
  cardId: string,
  input: RecordCreditCardPaymentInput
): Promise<RecordCreditCardPaymentResult> {
  const admin = await requireEmployee("ADMIN");

  if (!(input.amount > 0)) return { ok: false, error: "Enter a valid payment amount." };
  if (!(CREDIT_CARD_PAYMENT_METHODS as readonly string[]).includes(input.paymentMethod)) {
    return { ok: false, error: "Select a valid payment method." };
  }

  const card = await prisma.creditCard.findUnique({ where: { id: cardId } });
  if (!card) return { ok: false, error: "Credit card not found." };

  await prisma.$transaction([
    prisma.creditCardPayment.create({
      data: {
        creditCardId: cardId,
        date: new Date(input.date),
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        bankAccount: input.bankAccount.trim() || null,
        referenceNumber: input.referenceNumber.trim() || null,
        notes: input.notes.trim() || null,
        recordedById: admin.id,
      },
    }),
    prisma.creditCardAuditLog.create({
      data: {
        creditCardId: cardId,
        action: "Payment Recorded",
        description: `Payment of ${formatAed(input.amount)} recorded via ${input.paymentMethod}`,
        newValue: input.amount.toFixed(2),
        performedById: admin.id,
      },
    }),
  ]);

  revalidatePath("/admin/wallets");
  revalidatePath(`/admin/wallets/credit-cards/${cardId}`);
  return { ok: true };
}
