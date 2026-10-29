import Link from "next/link";
import { cookies, headers } from "next/headers";
import { tajawal } from "@/lib/fonts";
import { LangSwitch } from "@/components/jobs/public/LangSwitch";
import { pickLang, tx, type Lang } from "@/lib/jobs/publicText";

// The language for a request: ?lang= first, then the saved choice (cookie), then Accept-Language, then Arabic.
export async function requestLang(param?: string): Promise<Lang> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return pickLang(param, c.get("osta_jobs_lang")?.value, h.get("accept-language"));
}

// Header, footer, language and direction of every public jobs page. Arabic = RTL, English = LTR.
export function PublicShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${lang === "ar" ? tajawal.className : ""}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/jobs" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="text-slate-900">OS</span><span className="text-blue-600">TA</span>
            <span className="text-sm font-semibold text-slate-500">{tx(lang, "siteName")}</span>
          </Link>
          <LangSwitch current={lang} label={tx(lang, "language")} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} {tx(lang, "siteName")}</footer>
    </div>
  );
}
