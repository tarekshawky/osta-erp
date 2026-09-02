import type { InventoryTransactionRow } from "@/lib/inventoryData";
import { tajawal } from "@/lib/fonts";
import type { EmployeeLang } from "@/lib/employeeLang";

const TYPE_STYLES: Record<string, string> = {
  "Stock Received": "bg-green-50 text-green-700",
  "Stock Transfer": "bg-blue-50 text-blue-700",
  "Stock Used": "bg-slate-100 text-slate-600",
  "Stock Returned": "bg-cyan-50 text-cyan-700",
  "Stock Damaged": "bg-red-50 text-red-700",
  "Stock Lost": "bg-red-50 text-red-700",
  "Stock Adjustment": "bg-amber-50 text-amber-700",
  "Stock Reversed": "bg-purple-50 text-purple-700",
};

const TYPE_LABELS_AR: Record<string, string> = {
  "Stock Received": "استلام مخزون",
  "Stock Transfer": "نقل مخزون",
  "Stock Used": "استهلاك",
  "Stock Returned": "إرجاع",
  "Stock Damaged": "تالف",
  "Stock Lost": "مفقود",
  "Stock Adjustment": "تسوية",
  "Stock Reversed": "عكس حركة",
  "Warehouse Transfer": "نقل بين المستودعات",
  "Employee Transfer": "نقل بين الموظفين",
};

const T = {
  ar: {
    date: "التاريخ",
    item: "الصنف",
    type: "النوع",
    quantity: "الكمية",
    from: "من",
    to: "إلى",
    reference: "المرجع",
    createdBy: "بواسطة",
    empty: "لا توجد حركات مخزون بعد.",
  },
  en: {
    date: "Date",
    item: "Item",
    type: "Type",
    quantity: "Quantity",
    from: "From",
    to: "To",
    reference: "Reference",
    createdBy: "Created By",
    empty: "No inventory transactions yet.",
  },
} as const;

export function InventoryTransactionsTable({ rows, lang = "en" }: { rows: InventoryTransactionRow[]; lang?: EmployeeLang }) {
  const s = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className={`text-left text-slate-500 border-b border-slate-100 ${font}`} dir={dir}>
            <th className="px-4 py-3 font-medium">{s.date}</th>
            <th className="px-4 py-3 font-medium">{s.item}</th>
            <th className="px-4 py-3 font-medium">{s.type}</th>
            <th className="px-4 py-3 font-medium text-right">{s.quantity}</th>
            <th className="px-4 py-3 font-medium">{s.from}</th>
            <th className="px-4 py-3 font-medium">{s.to}</th>
            <th className="px-4 py-3 font-medium">{s.reference}</th>
            <th className="px-4 py-3 font-medium">{s.createdBy}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-slate-900 font-medium">{r.itemDisplayName}</td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${TYPE_STYLES[r.type] ?? "bg-slate-100 text-slate-600"} ${font}`}
                  dir={dir}
                >
                  {lang === "ar" ? TYPE_LABELS_AR[r.type] ?? r.type : r.type}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-slate-900 font-medium whitespace-nowrap">
                {r.quantity.toLocaleString()} {r.unit}
              </td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.fromLabel}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.toLabel}</td>
              <td className="px-4 py-3 text-slate-600">{r.reference ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.createdByName}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className={`px-4 py-10 text-center text-slate-400 ${font}`} dir={dir}>
                {s.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
