import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { MyInventoryList } from "@/components/inventory/MyInventoryList";
import { RequestStockForm } from "@/components/inventory/RequestStockForm";
import { ReturnStockForm } from "@/components/inventory/ReturnStockForm";
import { ReportDamagedForm } from "@/components/inventory/ReportDamagedForm";
import { InventoryTransactionsTable } from "@/components/inventory/InventoryTransactionsTable";
import { getEmployeeInventory, getInventoryItemDisplayName, getInventoryTransactions } from "@/lib/inventoryData";
import { getEmployeeLang, pickLang } from "@/lib/employeeLang";
import { tajawal } from "@/lib/fonts";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-green-50 text-green-700",
  PartiallyApproved: "bg-blue-50 text-blue-700",
  Rejected: "bg-red-50 text-red-600",
};

const STATUS_LABELS_AR: Record<string, string> = {
  Pending: "قيد الانتظار",
  Approved: "تمت الموافقة",
  PartiallyApproved: "موافقة جزئية",
  Rejected: "مرفوض",
};

type InventoryTab = "stock" | "request" | "return" | "damaged" | "history";

const TABS: { id: InventoryTab; label: { ar: string; en: string } }[] = [
  { id: "stock", label: { ar: "مخزوني", en: "My Stock" } },
  { id: "request", label: { ar: "طلب مخزون", en: "Request Stock" } },
  { id: "return", label: { ar: "إرجاع مخزون", en: "Return Stock" } },
  { id: "damaged", label: { ar: "أصناف تالفة", en: "Damaged Items" } },
  { id: "history", label: { ar: "سجل الحركات", en: "Stock History" } },
];

const T = {
  ar: {
    scanItem: "مسح صنف",
    scanHint: "امسح الرمز الشريطي أو رمز QR للبحث السريع عن صنف.",
    stockHint: "ما تملكه حالياً. الأدمن فقط يستطيع تغيير هذه الكميات.",
    myRequests: "طلباتي",
    requested: "طلبت",
    approved: "تمت الموافقة على",
    myReturns: "إرجاعاتي",
    noStockHistory: "لا توجد حركات مخزون بعد.",
  },
  en: {
    scanItem: "Scan Item",
    scanHint: "Scan a barcode/QR code to quickly look up an item.",
    stockHint: "What you currently have. Only Admin can change these quantities.",
    myRequests: "My Requests",
    requested: "Requested",
    approved: "Approved",
    myReturns: "My Returns",
    noStockHistory: "No stock movements yet.",
  },
} as const;

export default async function MyInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab: InventoryTab = TABS.some((t) => t.id === tabParam) ? (tabParam as InventoryTab) : "stock";

  const employee = await requireEmployee("EMPLOYEE");
  const lang = await getEmployeeLang();
  const s = pickLang(lang, T);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";

  const [rows, activeItems, myRequests, myReturns, history] = await Promise.all([
    getEmployeeInventory(employee.id),
    prisma.inventoryItem.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
    prisma.stockRequest.findMany({
      where: { employeeId: employee.id },
      include: { inventoryItem: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.stockReturnRequest.findMany({
      where: { employeeId: employee.id },
      include: { inventoryItem: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getInventoryTransactions({ employeeId: employee.id }),
  ]);

  const itemOptions = activeItems.map((i) => ({ id: i.id, displayName: getInventoryItemDisplayName(i), unit: i.unit }));
  const myStockOptions = rows.filter((r) => r.current > 0).map((r) => ({ id: r.itemId, displayName: r.displayName, unit: r.unit, current: r.current }));

  return (
    <div className="pb-8">
      <TopBar title={{ ar: "مخزوني", en: "My Inventory" }} />
      <div className="px-5 py-4">
        <Link
          href="/employee/inventory/scan"
          className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
        >
          <div dir={dir}>
            <div className={`font-semibold text-slate-900 ${font}`}>{s.scanItem}</div>
            <div className={`text-sm text-slate-500 mt-0.5 ${font}`}>{s.scanHint}</div>
          </div>
        </Link>

        <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/employee/inventory?tab=${t.id}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                tab === t.id ? "bg-blue-700 text-white" : "text-slate-600"
              } ${font}`}
              dir={dir}
            >
              {pickLang(lang, t.label)}
            </Link>
          ))}
        </div>

        {tab === "stock" && (
          <>
            <p className={`text-sm text-slate-500 mb-4 ${font}`} dir={dir}>
              {s.stockHint}
            </p>
            <MyInventoryList rows={rows} lang={lang} />
          </>
        )}

        {tab === "request" && (
          <>
            <div
              className="mb-4 rounded-2xl px-4 py-3.5 shadow-sm"
              style={{ background: "linear-gradient(135deg, #0E3A7A, #081f42)" }}
            >
              <div className={`text-[15px] font-bold text-white ${font}`} dir={dir}>
                {pickLang(lang, TABS[1].label)}
              </div>
            </div>

            <RequestStockForm items={itemOptions} lang={lang} />

            {myRequests.length > 0 && (
              <>
                <div className="mt-6 mb-3" dir={dir}>
                  <span className={`font-bold text-slate-900 text-[14px] ${font}`}>{s.myRequests}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {myRequests.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm flex items-center justify-between">
                      <div dir={dir}>
                        <div className="text-sm font-medium text-slate-900">{getInventoryItemDisplayName(r.inventoryItem)}</div>
                        <div className={`text-xs text-slate-500 ${font}`}>
                          {s.requested} {r.requestedQuantity.toLocaleString()} {r.inventoryItem.unit}
                          {r.approvedQuantity != null && r.status !== "Rejected" && ` · ${s.approved} ${r.approvedQuantity.toLocaleString()}`}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600"} ${font}`}
                        dir={dir}
                      >
                        {lang === "ar" ? STATUS_LABELS_AR[r.status] ?? r.status : r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "return" && (
          <>
            <h3 className={`mb-3 font-semibold text-slate-900 ${font}`} dir={dir}>
              {pickLang(lang, TABS[2].label)}
            </h3>
            <ReturnStockForm items={myStockOptions} lang={lang} />

            {myReturns.length > 0 && (
              <>
                <h3 className={`mt-6 mb-3 font-semibold text-slate-900 ${font}`} dir={dir}>
                  {s.myReturns}
                </h3>
                <div className="flex flex-col gap-2">
                  {myReturns.map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
                      <div dir={dir}>
                        <div className="text-sm font-medium text-slate-900">{getInventoryItemDisplayName(r.inventoryItem)}</div>
                        <div className="text-xs text-slate-500">
                          {r.quantity.toLocaleString()} {r.inventoryItem.unit} · {r.reason}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600"} ${font}`}
                        dir={dir}
                      >
                        {lang === "ar" ? STATUS_LABELS_AR[r.status] ?? r.status : r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "damaged" && (
          <>
            <h3 className={`mb-3 font-semibold text-slate-900 ${font}`} dir={dir}>
              {pickLang(lang, TABS[3].label)}
            </h3>
            <ReportDamagedForm items={myStockOptions} lang={lang} />
          </>
        )}

        {tab === "history" && (
          <>
            <h3 className={`mb-3 font-semibold text-slate-900 ${font}`} dir={dir}>
              {pickLang(lang, TABS[4].label)}
            </h3>
            {history.length === 0 ? (
              <p className={`text-sm text-slate-400 ${font}`} dir={dir}>
                {s.noStockHistory}
              </p>
            ) : (
              <InventoryTransactionsTable rows={history} lang={lang} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
