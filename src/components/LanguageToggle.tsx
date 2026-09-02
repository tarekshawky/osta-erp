"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEmployeeLang } from "@/app/actions/employeeLang";
import type { EmployeeLang } from "@/lib/employeeLang";

export function LanguageToggle({ lang }: { lang: EmployeeLang }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: EmployeeLang) {
    if (next === lang || isPending) return;
    startTransition(async () => {
      await setEmployeeLang(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-bold">
      <button
        type="button"
        onClick={() => switchTo("ar")}
        disabled={isPending}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          lang === "ar" ? "bg-blue-700 text-white" : "text-slate-500"
        }`}
      >
        عربي
      </button>
      <button
        type="button"
        onClick={() => switchTo("en")}
        disabled={isPending}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          lang === "en" ? "bg-blue-700 text-white" : "text-slate-500"
        }`}
      >
        EN
      </button>
    </div>
  );
}
