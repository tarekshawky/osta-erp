"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import {
  RENTAL_AGREEMENT_STATUSES,
  RENTAL_PAYMENT_METHODS,
  ensureRentalTransactionsGenerated,
} from "@/lib/rentalData";

export type RentalAgreementFormInput = {
  customerId: string;
  agreementName: string;
  rentalType: string;
  monthlyRent: number;
  paymentFrequency: string;
  startDate: string;
  endDate: string;
  paymentDueDay: number;
  paymentMethod: string;
  notes: string;
  status: string;
};

export type RentalAgreementActionResult = { ok: boolean; id?: string; error?: string };

function validate(input: RentalAgreementFormInput): string | null {
  if (!input.customerId) return "Select a customer.";
  if (!input.agreementName.trim()) return "Agreement Name is required.";
  if (!(input.monthlyRent > 0)) return "Monthly Rent must be greater than 0.";
  if (!input.startDate) return "Start Date is required.";
  if (!(RENTAL_AGREEMENT_STATUSES as readonly string[]).includes(input.status)) return "Invalid status.";
  return null;
}

export async function createRentalAgreement(input: RentalAgreementFormInput): Promise<RentalAgreementActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const agreement = await prisma.rentalAgreement.create({
    data: {
      customerId: input.customerId,
      agreementName: input.agreementName.trim(),
      rentalType: input.rentalType,
      monthlyRent: input.monthlyRent,
      paymentFrequency: input.paymentFrequency,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      paymentDueDay: input.paymentDueDay,
      paymentMethod: input.paymentMethod,
      notes: input.notes.trim() || null,
      status: input.status,
      createdById: admin.id,
    },
  });

  if (agreement.status === "Active") {
    await ensureRentalTransactionsGenerated(agreement.id);
  }

  revalidatePath(`/admin/customers/${input.customerId}`);
  revalidatePath("/admin/rental-expenses");
  return { ok: true, id: agreement.id };
}

export async function updateRentalAgreement(
  agreementId: string,
  input: RentalAgreementFormInput
): Promise<RentalAgreementActionResult> {
  await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.rentalAgreement.findUnique({ where: { id: agreementId } });
  if (!existing) return { ok: false, error: "Rental agreement not found." };

  const rateChanged = existing.monthlyRent !== input.monthlyRent;

  await prisma.rentalAgreement.update({
    where: { id: agreementId },
    data: {
      agreementName: input.agreementName.trim(),
      rentalType: input.rentalType,
      monthlyRent: input.monthlyRent,
      paymentFrequency: input.paymentFrequency,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      paymentDueDay: input.paymentDueDay,
      paymentMethod: input.paymentMethod,
      notes: input.notes.trim() || null,
      status: input.status,
    },
  });

  // A rate change only regenerates transactions that haven't happened yet and
  // haven't been paid -- Overdue/Paid rows stay at whatever rate was in effect
  // when they were originally due.
  if (rateChanged) {
    const futureUnpaid = await prisma.rentalTransaction.findMany({
      where: { rentalAgreementId: agreementId, paymentStatus: { in: ["Pending", "Due"] } },
      select: { id: true, expenseId: true },
    });
    for (const t of futureUnpaid) {
      if (t.expenseId) await prisma.expense.delete({ where: { id: t.expenseId } });
      await prisma.rentalTransaction.delete({ where: { id: t.id } });
    }
  }

  if (input.status === "Active") {
    await ensureRentalTransactionsGenerated(agreementId);
  }

  revalidatePath(`/admin/customers/${input.customerId}`);
  revalidatePath("/admin/rental-expenses");
  return { ok: true, id: agreementId };
}

export async function pauseRentalAgreement(agreementId: string): Promise<RentalAgreementActionResult> {
  await requireEmployee("ADMIN");
  const agreement = await prisma.rentalAgreement.update({
    where: { id: agreementId },
    data: { status: "Suspended" },
  });
  revalidatePath(`/admin/customers/${agreement.customerId}`);
  revalidatePath("/admin/rental-expenses");
  return { ok: true, id: agreementId };
}

export async function cancelRentalAgreement(agreementId: string): Promise<RentalAgreementActionResult> {
  await requireEmployee("ADMIN");
  const agreement = await prisma.rentalAgreement.update({
    where: { id: agreementId },
    data: { status: "Cancelled" },
  });

  // Future, still-unpaid transactions are cancelled (row kept for audit) and their
  // never-charged placeholder Expense is removed -- unlike a real recorded Expense,
  // which this app never programmatically deletes, an auto-generated placeholder
  // for rent that will now never be charged is safe to remove so it stops showing
  // up in Financial Reports.
  const futureUnpaid = await prisma.rentalTransaction.findMany({
    where: { rentalAgreementId: agreementId, paymentStatus: { in: ["Pending", "Due"] } },
    select: { id: true, expenseId: true },
  });
  for (const t of futureUnpaid) {
    if (t.expenseId) await prisma.expense.delete({ where: { id: t.expenseId } });
    await prisma.rentalTransaction.update({ where: { id: t.id }, data: { paymentStatus: "Cancelled", expenseId: null } });
  }

  revalidatePath(`/admin/customers/${agreement.customerId}`);
  revalidatePath("/admin/rental-expenses");
  return { ok: true, id: agreementId };
}

export async function renewRentalAgreement(
  oldAgreementId: string,
  input: RentalAgreementFormInput
): Promise<RentalAgreementActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const old = await prisma.rentalAgreement.findUnique({ where: { id: oldAgreementId } });
  if (!old) return { ok: false, error: "Rental agreement not found." };

  if (old.status !== "Cancelled") {
    await prisma.rentalAgreement.update({ where: { id: oldAgreementId }, data: { status: "Expired" } });
  }

  const created = await prisma.rentalAgreement.create({
    data: {
      customerId: input.customerId,
      agreementName: input.agreementName.trim(),
      rentalType: input.rentalType,
      monthlyRent: input.monthlyRent,
      paymentFrequency: input.paymentFrequency,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      paymentDueDay: input.paymentDueDay,
      paymentMethod: input.paymentMethod,
      notes: input.notes.trim() || null,
      status: input.status,
      createdById: admin.id,
    },
  });

  if (created.status === "Active") {
    await ensureRentalTransactionsGenerated(created.id);
  }

  revalidatePath(`/admin/customers/${input.customerId}`);
  revalidatePath("/admin/rental-expenses");
  return { ok: true, id: created.id };
}

export type RecordRentalPaymentInput = {
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
};

export async function recordRentalPayment(
  transactionId: string,
  input: RecordRentalPaymentInput
): Promise<RentalAgreementActionResult> {
  await requireEmployee("ADMIN");
  if (!(RENTAL_PAYMENT_METHODS as readonly string[]).includes(input.paymentMethod)) {
    return { ok: false, error: "Select a valid payment method." };
  }

  const transaction = await prisma.rentalTransaction.findUnique({
    where: { id: transactionId },
    include: { rentalAgreement: true },
  });
  if (!transaction) return { ok: false, error: "Rental transaction not found." };

  await prisma.$transaction([
    prisma.rentalTransaction.update({
      where: { id: transactionId },
      data: {
        paymentStatus: "Paid",
        paymentDate: new Date(input.paymentDate),
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber.trim() || null,
        notes: input.notes.trim() || null,
      },
    }),
    ...(transaction.expenseId
      ? [prisma.expense.update({ where: { id: transaction.expenseId }, data: { payment: input.paymentMethod } })]
      : []),
  ]);

  revalidatePath(`/admin/customers/${transaction.rentalAgreement.customerId}`);
  revalidatePath("/admin/rental-expenses");
  return { ok: true, id: transactionId };
}
