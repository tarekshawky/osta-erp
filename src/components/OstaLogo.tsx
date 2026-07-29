import { LogoImage } from "@/components/LogoImage";

export function OstaLogo({
  compact = false,
  align = "center",
}: {
  compact?: boolean;
  align?: "center" | "left";
}) {
  return (
    <div className={`flex flex-col ${align === "center" ? "items-center" : "items-start"}`}>
      <LogoImage className={compact ? "h-10 w-auto" : "h-16 w-auto"} />
      <div className="text-[10px] font-semibold tracking-[0.3em] text-slate-400 mt-2">
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
