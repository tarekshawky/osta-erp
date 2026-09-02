import { getEmployeeLang, pickLang, type EmployeeLang } from "@/lib/employeeLang";
import { LanguageToggle } from "@/components/LanguageToggle";
import { tajawal } from "@/lib/fonts";

function currentMonthLabel(lang: EmployeeLang) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-AE" : "en-US", { month: "short", year: "numeric" }).format(
    new Date()
  );
}

type Title = string | { ar: string; en: string };

export async function TopBar({ title = { ar: "أوستا للخدمات", en: "OSTA Services" } }: { title?: Title }) {
  const lang = await getEmployeeLang();
  const titleText = typeof title === "string" ? title : pickLang(lang, title);

  return (
    <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
      <h1
        className={`text-lg font-bold text-slate-900 ${lang === "ar" ? tajawal.className : ""}`}
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        {titleText}
      </h1>
      <div className="flex items-center gap-2">
        <LanguageToggle lang={lang} />
        <span className="px-3 py-1.5 rounded-full border border-slate-200 text-sm text-slate-600">
          {currentMonthLabel(lang)}
        </span>
        <span className="relative text-slate-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 8a6 6 0 0112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8z" strokeLinejoin="round" />
            <path d="M10 19a2 2 0 004 0" strokeLinecap="round" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
        </span>
      </div>
    </header>
  );
}
