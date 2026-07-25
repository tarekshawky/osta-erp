function OstaIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" className="shrink-0">
      <circle cx="22" cy="22" r="21" fill="#0f2a63" stroke="#fbbf24" strokeWidth="2" />
      <circle cx="22" cy="22" r="16" fill="none" stroke="#fde68a" strokeWidth="1" />
      <path
        d="M13 23l6 6 12-14"
        stroke="#fbbf24"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function OstaLogo({
  compact = false,
  align = "center",
}: {
  compact?: boolean;
  align?: "center" | "left";
}) {
  const wordmark = (
    <div className={`flex flex-col ${align === "center" ? "items-center" : "items-start"}`}>
      <div
        className={`font-black tracking-tight text-blue-950 ${
          compact ? "text-3xl" : "text-5xl"
        }`}
      >
        OSTA
      </div>
      <div className="text-[10px] font-semibold tracking-[0.3em] text-slate-400 mt-1">
        SERVICES
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="h-px w-6 bg-blue-300" />
        <span className="text-blue-600 text-sm" dir="rtl">
          خدمات أسطا
        </span>
        {align === "center" && <span className="h-px w-6 bg-blue-300" />}
      </div>
    </div>
  );

  if (align === "left") {
    return (
      <div className="flex items-center gap-3">
        <OstaIcon size={compact ? 40 : 56} />
        {wordmark}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <OstaIcon size={compact ? 48 : 64} />
      <div className="mt-3">{wordmark}</div>
    </div>
  );
}
