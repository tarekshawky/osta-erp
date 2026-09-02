export const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export function Field({
  label,
  children,
  dir,
  labelClassName = "",
}: {
  label: string;
  children: React.ReactNode;
  dir?: "rtl" | "ltr";
  labelClassName?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={`text-xs font-medium text-slate-600 ${labelClassName}`} dir={dir}>
        {label}
      </span>
      {children}
    </label>
  );
}
