export function OstaLogo({
  compact = false,
  align = "center",
}: {
  compact?: boolean;
  align?: "center" | "left";
}) {
  return (
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
}
