import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ClassifiedExpenseForm } from "@/components/expense/ClassifiedExpenseForm";

const GROUPS = ["employee", "equipment-rental", "transport-rental"] as const;

export default async function NewClassifiedExpensePage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  if (!(GROUPS as readonly string[]).includes(group)) notFound();
  const [teams, employees, cards] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.creditCard.findMany({ where: { status: "Active" }, orderBy: { name: "asc" }, select: { id: true, name: true, lastFour: true } }),
  ]);
  return (
    <div className="pb-10">
      <AdminTopBar title="Add Expense" hideMonth />
      <div className="px-4 py-6 sm:px-6">
        <ClassifiedExpenseForm group={group as (typeof GROUPS)[number]} teams={teams} employees={employees} cards={cards} />
      </div>
    </div>
  );
}
