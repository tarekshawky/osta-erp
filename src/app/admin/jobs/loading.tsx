// Shown while any Jobs page loads: skeleton cards and table rows.
export default function Loading() {
  return (
    <div className="animate-pulse px-6 py-6" aria-busy="true" aria-label="Loading">
      <div className="mb-6 h-7 w-56 rounded bg-slate-200" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-20 rounded-xl bg-slate-100" />)}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-11 rounded-lg bg-slate-100" />)}
      </div>
    </div>
  );
}
