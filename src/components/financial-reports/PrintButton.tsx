"use client";

export function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block align-middle mr-1.5 -mt-0.5">
        <path
          d="M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a1 1 0 011-1h16a1 1 0 011 1v6a1 1 0 01-1 1h-2M6 14h12v7H6v-7z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Print
    </button>
  );
}
