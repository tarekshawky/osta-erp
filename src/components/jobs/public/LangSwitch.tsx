"use client";

import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/jobs/publicText";

// Saves the visitor's choice in a cookie and reloads the same page. The address (/jobs/[slug]) stays exactly the same.
export function LangSwitch({ current, label }: { current: Lang; label: string }) {
  const router = useRouter();
  const next: Lang = current === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `osta_jobs_lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        // A shared ?lang= link would keep winning over the cookie, so it is dropped from the address.
        const url = new URL(window.location.href);
        if (url.searchParams.has("lang")) {
          url.searchParams.delete("lang");
          router.replace(url.pathname + url.search);
        }
        router.refresh();
      }}
      className="rounded-full border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      lang={next}
    >
      {label}
    </button>
  );
}
