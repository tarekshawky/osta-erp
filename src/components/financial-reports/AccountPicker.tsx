"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CHART_OF_ACCOUNTS } from "@/lib/financialReportsLedger";

export function AccountPicker({ account }: { account: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function push(newAccount: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("account", newAccount);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="no-print flex flex-col gap-1 w-fit">
      <span className="text-xs font-medium text-slate-600">Account</span>
      <select
        value={account}
        onChange={(e) => push(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
      >
        {CHART_OF_ACCOUNTS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </label>
  );
}
