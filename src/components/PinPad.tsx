"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { OstaLogo } from "./OstaLogo";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export function PinPad({
  title,
  action,
  redirectTo,
}: {
  title: string;
  action: (pin: string) => Promise<{ ok: boolean }>;
  redirectTo: string;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function press(key: string) {
    if (isPending) return;
    setError(null);
    if (key === "back") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === "") return;
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) {
      startTransition(async () => {
        const result = await action(next);
        if (result.ok) {
          router.push(redirectTo);
          router.refresh();
        } else {
          setError("Invalid PIN. Please try again.");
          setPin("");
        }
      });
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center bg-white px-6">
      <button
        onClick={() => router.push("/")}
        aria-label="Back"
        className="self-start mt-6 text-slate-600 hover:text-slate-900"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="mt-8">
        <OstaLogo compact />
      </div>

      <h1 className="mt-10 text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-slate-500 text-sm">Enter your 4-digit code</p>

      <div className="mt-6 flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 ${
              i < pin.length ? "bg-blue-600 border-blue-600" : "border-slate-300"
            }`}
          />
        ))}
      </div>

      <div className="h-6 mt-3">
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 w-full max-w-xs">
        {KEYS.map((key, i) =>
          key === "" ? (
            <div key={i} />
          ) : key === "back" ? (
            <button
              key={i}
              onClick={() => press("back")}
              className="h-16 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 4H8l-7 8 7 8h13a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z" strokeLinejoin="round" />
                <path d="M13 9l6 6M19 9l-6 6" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <button
              key={i}
              onClick={() => press(key)}
              className="h-16 rounded-xl bg-slate-100 hover:bg-slate-200 text-2xl font-medium text-slate-800 transition-colors"
            >
              {key}
            </button>
          )
        )}
      </div>
    </div>
  );
}
