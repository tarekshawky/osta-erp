import { EXPENSE_CATEGORY_STYLES } from "@/lib/expenseData";

export function CategoryBadge({ category }: { category: string | null | undefined }) {
  if (!category) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${EXPENSE_CATEGORY_STYLES[category] ?? "bg-slate-100 text-slate-600"}`}
    >
      {category}
    </span>
  );
}
