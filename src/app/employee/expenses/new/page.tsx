import { createExpense } from "./actions";
import { TopBar } from "@/components/TopBar";
import { Field, inputClassName } from "@/components/FormField";

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="pb-8">
      <TopBar title="Add Expense" />
      <form action={createExpense} className="px-5 py-5 flex flex-col gap-4">
        {error && (
          <p className="text-sm text-red-500">Please fill in all fields with a valid amount.</p>
        )}
        <Field label="Description">
          <input name="description" required className={inputClassName} placeholder="e.g. Fuel" />
        </Field>
        <Field label="Category">
          <select name="category" className={inputClassName} defaultValue="Fuel">
            <option>Fuel</option>
            <option>Parts</option>
            <option>Supplies</option>
            <option>Transport</option>
            <option>Misc</option>
          </select>
        </Field>
        <Field label="Amount (AED)">
          <input name="amount" type="number" step="0.01" min="0.01" required className={inputClassName} />
        </Field>
        <Field label="Date">
          <input
            name="date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputClassName}
          />
        </Field>
        <button
          type="submit"
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-medium text-sm"
        >
          Add Expense
        </button>
      </form>
    </div>
  );
}
