import { prisma } from "@/lib/prisma";

type ExpenseDuplicateInput = {
  date: Date;
  description: string;
  category: string | null;
  vehicle: string | null;
  subcategory: string | null;
  payment: string;
  amount: number;
  createdById: string;
};

// An exact expense submitted by the same employee for the same day is almost
// certainly an accidental second submission. Keeping the check employee-scoped
// still allows different employees to record legitimate matching expenses.
export async function findDuplicateExpense(input: ExpenseDuplicateInput) {
  const startOfDay = new Date(
    Date.UTC(input.date.getUTCFullYear(), input.date.getUTCMonth(), input.date.getUTCDate())
  );
  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1);

  return prisma.expense.findFirst({
    where: {
      createdById: input.createdById,
      date: { gte: startOfDay, lt: startOfNextDay },
      description: { equals: input.description.trim(), mode: "insensitive" },
      category: input.category,
      vehicle: input.vehicle,
      subcategory: input.subcategory,
      payment: input.payment,
      amount: input.amount,
    },
    select: { id: true },
  });
}
