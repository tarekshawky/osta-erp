import { TopBar } from "@/components/TopBar";
import { NewExpenseForm } from "./NewExpenseForm";

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="pb-8">
      <TopBar title="Add Expense" />
      {error && (
        <p className="text-sm text-red-500 px-5 pt-4">Please fill in all fields with a valid amount.</p>
      )}
      <NewExpenseForm />
    </div>
  );
}
