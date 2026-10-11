// Lives outside the "use client" SeoPanel so server pages can call it too.
export const scoreStyle = (score: number) => (score >= 80 ? "bg-emerald-50 text-emerald-700" : score >= 55 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600");
