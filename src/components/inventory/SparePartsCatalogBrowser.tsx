"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { formatAed } from "@/lib/format";
import { tajawal } from "@/lib/fonts";
import type { EmployeeLang } from "@/lib/employeeLang";
import { submitStockRequestsBatch } from "@/app/employee/inventory/request/actions";

const ACCENT = "#1A56DB";

export type CatalogItem = {
  id: string;
  sku: string;
  name: string;
  nameAr: string | null;
  specification: string | null;
  category: string;
  unit: string;
  sellingPrice: number | null;
  myStock: number;
  totalStock: number;
};

type SortKey = "name" | "priceAsc" | "priceDesc";

const T = {
  ar: {
    searchPlaceholder: "ابحث عن القطعة أو المقاس أو الكود...",
    allCategories: "الكل",
    itemsSuffix: "صنف",
    sortBy: "ترتيب حسب",
    sortName: "الاسم",
    sortPriceAsc: "السعر: من الأقل",
    sortPriceDesc: "السعر: من الأعلى",
    myStock: "في مخزوني",
    total: "الإجمالي",
    sellingPrice: "سعر البيع",
    add: "إضافة",
    cart: "السلة",
    reviewSubmit: "مراجعة وإرسال",
    empty: "لا توجد قطع مطابقة لبحثك.",
    reviewTitle: "مراجعة الطلب",
    remove: "إزالة",
    submitting: "جارٍ الإرسال...",
    submit: "إرسال الطلب",
    submitted: "تم إرسال الطلبات.",
    error: "حدث خطأ ما.",
    emptyCart: "السلة فارغة.",
    close: "إغلاق",
  },
  en: {
    searchPlaceholder: "Search by part, size or code...",
    allCategories: "All",
    itemsSuffix: "items",
    sortBy: "Sort by",
    sortName: "Name",
    sortPriceAsc: "Price: Low to High",
    sortPriceDesc: "Price: High to Low",
    myStock: "My Stock",
    total: "Total",
    sellingPrice: "Selling Price",
    add: "Add",
    cart: "Cart",
    reviewSubmit: "Review & Submit",
    empty: "No items match your search.",
    reviewTitle: "Review Request",
    remove: "Remove",
    submitting: "Submitting...",
    submit: "Submit Request",
    submitted: "Requests submitted.",
    error: "Something went wrong.",
    emptyCart: "Your cart is empty.",
    close: "Close",
  },
} as const;

export function SparePartsCatalogBrowser({
  items,
  categories,
  lang,
}: {
  items: CatalogItem[];
  categories: string[];
  lang: EmployeeLang;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("name");
  const [qtyDraft, setQtyDraft] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<Record<string, number>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const s = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = items.filter((i) => {
      if (category && i.category !== category) return false;
      if (!q) return true;
      return (
        i.sku.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        (i.nameAr ?? "").toLowerCase().includes(q) ||
        (i.specification ?? "").toLowerCase().includes(q)
      );
    });
    if (sort === "priceAsc") rows = [...rows].sort((a, b) => (a.sellingPrice ?? 0) - (b.sellingPrice ?? 0));
    else if (sort === "priceDesc") rows = [...rows].sort((a, b) => (b.sellingPrice ?? 0) - (a.sellingPrice ?? 0));
    return rows;
  }, [items, search, category, sort]);

  const cartCount = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const cartLines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ item: items.find((i) => i.id === id)!, qty }))
    .filter((l) => !!l.item);

  function qtyFor(id: string) {
    return qtyDraft[id] ?? 1;
  }
  function setQty(id: string, qty: number) {
    setQtyDraft((prev) => ({ ...prev, [id]: Math.max(1, qty) }));
  }
  function addToCart(id: string) {
    const qty = qtyFor(id);
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + qty }));
    setQtyDraft((prev) => ({ ...prev, [id]: 1 }));
  }
  function updateCartQty(id: string, qty: number) {
    setCart((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  }
  function removeFromCart(id: string) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitStockRequestsBatch(
        cartLines.map((l) => ({ inventoryItemId: l.item.id, requestedQuantity: l.qty }))
      );
      if (res.ok) {
        showToast(s.submitted);
        setCart({});
        setReviewOpen(false);
        router.push("/employee/inventory?tab=request");
      } else {
        setError(res.error ?? s.error);
      }
    });
  }

  return (
    <div className="px-4 pb-6" dir={dir}>
      {/* SEARCH + CART */}
      <div className="flex flex-row items-center gap-2 py-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={s.searchPlaceholder}
          dir={dir}
          className={`flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ${font}`}
        />
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="relative flex-shrink-0 h-11 w-11 rounded-full flex items-center justify-center"
          style={{ background: ACCENT }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.9">
            <path d="M4 5h2l2.2 11.2a2 2 0 002 1.8h7.6a2 2 0 002-1.7L21 8H6.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="20.5" r="1.3" fill="#ffffff" stroke="none" />
            <circle cx="17" cy="20.5" r="1.3" fill="#ffffff" stroke="none" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-1 border-2 border-white">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* CATEGORY CHIPS */}
      <div className="flex flex-row gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ${font} ${
            category === null ? "text-white" : "border border-slate-200 text-slate-600 bg-white"
          }`}
          style={category === null ? { background: ACCENT } : undefined}
        >
          {s.allCategories}
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap ${font} ${
              category === c ? "text-white" : "border border-slate-200 text-slate-600 bg-white"
            }`}
            style={category === c ? { background: ACCENT } : undefined}
          >
            {c}
          </button>
        ))}
      </div>

      {/* COUNT + SORT */}
      <div className="flex flex-row items-center justify-between mb-3">
        <span className={`text-sm text-slate-500 ${font}`}>
          {filtered.length} {s.itemsSuffix}
        </span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className={`rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 ${font}`}
        >
          <option value="name">{s.sortName}</option>
          <option value="priceAsc">{s.sortPriceAsc}</option>
          <option value="priceDesc">{s.sortPriceDesc}</option>
        </select>
      </div>

      {/* PRODUCT LIST */}
      <div className="flex flex-col gap-3">
        {filtered.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm flex flex-row gap-3">
            <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-slate-100 flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a7adb6" strokeWidth="1.6">
                <rect x="6" y="7" width="12" height="10" rx="4" />
                <path d="M9 4v3M15 4v3M9 20v-3M15 20v-3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              {item.nameAr && (
                <div className={`font-bold text-sm text-slate-900 ${tajawal.className}`} dir="rtl">
                  {item.nameAr}
                </div>
              )}
              <div className="text-xs text-slate-500 truncate">{item.name}</div>
              {item.specification && <div className="text-[11px] text-slate-400">{item.specification}</div>}
              <div className="inline-block mt-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{item.sku}</div>

              <div className="mt-1.5 flex flex-row items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className={`text-slate-500 ${font}`}>
                    {s.myStock}: {item.myStock.toLocaleString()} {item.unit}
                  </span>
                </span>
                <span className={`text-slate-400 ${font}`}>
                  {s.total}: {item.totalStock.toLocaleString()} {item.unit}
                </span>
              </div>

              <div className="mt-2 flex flex-row items-center justify-between">
                <div>
                  <div className="font-bold text-sm" style={{ color: ACCENT }}>
                    {formatAed(item.sellingPrice ?? 0)}
                  </div>
                  <div className={`text-[10px] text-slate-400 ${font}`}>{s.sellingPrice}</div>
                </div>

                <div className="flex flex-row items-center gap-1.5">
                  <div className="flex flex-row items-center rounded-lg bg-slate-100 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQty(item.id, qtyFor(item.id) - 1)}
                      className="w-6 h-6 flex items-center justify-center text-slate-600 font-bold text-sm"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-xs font-semibold text-slate-900">{qtyFor(item.id)}</span>
                    <button
                      type="button"
                      onClick={() => setQty(item.id, qtyFor(item.id) + 1)}
                      className="w-6 h-6 flex items-center justify-center text-slate-600 font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(item.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white ${font}`}
                    style={{ background: ACCENT }}
                  >
                    {s.add}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className={`text-center text-sm text-slate-400 py-16 ${font}`}>{s.empty}</p>
        )}
      </div>

      {/* REVIEW / CART SHEET */}
      {reviewOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4"
          onClick={() => setReviewOpen(false)}
        >
          <div
            className="w-full sm:max-w-sm max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5"
            dir={dir}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-row items-center justify-between mb-3">
              <h3 className={`font-bold text-slate-900 ${font}`}>{s.reviewTitle}</h3>
              <button onClick={() => setReviewOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {cartLines.length === 0 ? (
              <p className={`text-sm text-slate-400 text-center py-8 ${font}`}>{s.emptyCart}</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {cartLines.map(({ item, qty }) => (
                  <div key={item.id} className="rounded-xl border border-slate-100 p-3 flex flex-row items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{item.nameAr ?? item.name}</div>
                      <div className="text-xs text-slate-400">{item.name}</div>
                    </div>
                    <div className="flex flex-row items-center gap-2 flex-shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={qty}
                        onChange={(e) => updateCartQty(item.id, Number(e.target.value))}
                        className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-sm text-center"
                      />
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className={`text-xs text-red-500 hover:text-red-600 ${font}`}
                      >
                        {s.remove}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            {cartLines.length > 0 && (
              <button
                type="button"
                disabled={isPending}
                onClick={submit}
                style={{ background: ACCENT }}
                className={`mt-4 w-full rounded-xl disabled:opacity-60 text-white text-sm font-medium py-3 ${font}`}
              >
                {isPending ? s.submitting : s.submit}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
