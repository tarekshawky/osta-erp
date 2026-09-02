import { TopBar } from "@/components/TopBar";
import { EmployeeScanLookup } from "@/components/inventory/EmployeeScanLookup";
import { getEmployeeLang, pickLang } from "@/lib/employeeLang";
import { tajawal } from "@/lib/fonts";

const T = {
  ar: { hint: "امسح الرمز الشريطي أو رمز QR أو أدخل رمز الصنف (SKU) للبحث السريع." },
  en: { hint: "Scan a barcode/QR code or type a SKU to quickly look up an item." },
} as const;

export default async function EmployeeScanPage() {
  const lang = await getEmployeeLang();
  const s = pickLang(lang, T);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? tajawal.className : "";

  return (
    <div className="pb-8">
      <TopBar title={{ ar: "مسح الصنف", en: "Scan Item" }} />
      <div className="px-5 py-4">
        <p className={`text-sm text-slate-500 mb-4 ${font}`} dir={dir}>
          {s.hint}
        </p>
        <EmployeeScanLookup lang={lang} />
      </div>
    </div>
  );
}
