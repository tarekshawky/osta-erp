import type { ReactNode } from "react";

// One stat card for every admin page: a tinted icon tile (colour and icon chosen from the card's colour and label, so all
// pages look alike without each page choosing), the label and the value. Pure presentation.
const TONES = {
  blue: { tile: "#E6EEFD", text: "#1E5BD8" },
  green: { tile: "#E3F6EC", text: "#138A4C" },
  orange: { tile: "#FFEEDF", text: "#C2560C" },
  purple: { tile: "#F0E8FD", text: "#7B3FE4" },
  pink: { tile: "#FDE7EE", text: "#C2185B" },
  teal: { tile: "#DFF5F8", text: "#0E7C8C" },
  gray: { tile: "#EDF0F5", text: "#3D4B66" },
} as const;

function toneOf(valueClassName: string): keyof typeof TONES {
  if (/green|emerald/.test(valueClassName)) return "green";
  if (/red|rose/.test(valueClassName)) return "pink";
  if (/amber|orange|yellow/.test(valueClassName)) return "orange";
  if (/purple|violet|indigo/.test(valueClassName)) return "purple";
  if (/teal|cyan/.test(valueClassName)) return "teal";
  return "blue"; // blue, or no colour given: the brand blue
}

const P = { strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ICONS: Record<string, ReactNode> = {
  money: (<><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>),
  document: (<><path d="M7 3h7l5 5v13H7z" {...P} /><path d="M14 3v5h5M10 13h6M10 17h4" {...P} /></>),
  expense: (<><path d="M4 7h14a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7zM4 7l2-3h10" {...P} /><path d="M12 11v5m0 0l-2-2m2 2l2-2" {...P} /></>),
  people: (<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" {...P} /><circle cx="17" cy="8" r="2.4" /><path d="M15.5 14.2c2.5.4 4.5 2.7 4.5 5.8" {...P} /></>),
  order: (<><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" {...P} /></>),
  card: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" {...P} /></>),
  box: (<><path d="M21 8l-9-5-9 5 9 5 9-5z" {...P} /><path d="M3 8v8l9 5 9-5V8M12 13v8" {...P} /></>),
  car: (<><path d="M4 16v-4l2-5a2 2 0 012-1h8a2 2 0 012 1l2 5v4" {...P} /><path d="M3 16h18v2H3z" {...P} /><circle cx="7.5" cy="16" r="1.5" /><circle cx="16.5" cy="16" r="1.5" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" {...P} /></>),
  chart: (<path d="M4 20V10M12 20V4M20 20v-7" {...P} />),
};

function iconOf(label: string): string {
  const l = label.toLowerCase();
  if (/unpaid|outstanding|overdue|due|pending|remaining/.test(l)) return "clock";
  if (/expense|cost|spend|salary|payroll|deduction|advance/.test(l)) return "expense";
  if (/invoice/.test(l)) return "document";
  if (/employee|customer|team|worker|user|staff|applicant|candidate|lead/.test(l)) return "people";
  if (/order|booking|request|quotation|warranty|report/.test(l)) return "order";
  if (/cash|bank|ziina|card|wallet|collect|payment/.test(l)) return "card";
  if (/stock|item|inventory|warehouse|product|supplier|damaged/.test(l)) return "box";
  if (/vehicle|fleet|fine|car/.test(l)) return "car";
  if (/revenue|paid|sales|income|amount|total|profit|balance/.test(l)) return "money";
  return "chart";
}

export function AdminStatCard({
  label,
  value,
  valueClassName = "text-slate-900",
  hint,
  hintClassName = "text-slate-500",
}: {
  label: string;
  value: string;
  valueClassName?: string;
  hint?: string;
  hintClassName?: string;
}) {
  const tone = TONES[toneOf(valueClassName)];
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: tone.tile, color: tone.text }} aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          {ICONS[iconOf(label)]}
        </svg>
      </span>
      <div className="min-w-0 max-w-full">
        <div className="text-sm text-slate-500">{label}</div>
        <div className={`text-xl font-bold mt-0.5 sm:text-2xl ${valueClassName}`}>{value}</div>
        {hint && <div className={`mt-0.5 text-[11px] ${hintClassName}`}>{hint}</div>}
      </div>
    </div>
  );
}
