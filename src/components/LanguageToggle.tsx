"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEmployeeLang } from "@/app/actions/employeeLang";
import type { EmployeeLang } from "@/lib/employeeLang";
import { tajawal } from "@/lib/fonts";

export function LanguageToggle({ lang }: { lang: EmployeeLang }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const target: EmployeeLang = lang === "ar" ? "en" : "ar";
  const label = target === "ar" ? "عربي" : "English";

  function switchLang() {
    if (isPending) return;
    startTransition(async () => {
      await setEmployeeLang(target);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={switchLang}
      disabled={isPending}
      className={`rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 disabled:opacity-60 ${
        target === "ar" ? tajawal.className : ""
      }`}
      dir={target === "ar" ? "rtl" : "ltr"}
    >
      {label}
    </button>
  );
}
