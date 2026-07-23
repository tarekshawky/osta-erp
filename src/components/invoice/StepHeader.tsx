export function StepHeader({
  title,
  subtitle,
  step,
  totalSteps,
  onBack,
}: {
  title: string;
  subtitle: string;
  step: number;
  totalSteps: number;
  onBack: () => void;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-900" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            <span className="block font-bold text-slate-900 leading-tight">{title}</span>
            <span className="block text-xs text-slate-400 leading-tight">{subtitle}</span>
          </span>
        </button>
        <span className="text-sm text-slate-400">
          {step}/{totalSteps}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full ${i < step ? "bg-blue-700" : "bg-slate-200"}`}
          />
        ))}
      </div>
    </div>
  );
}
