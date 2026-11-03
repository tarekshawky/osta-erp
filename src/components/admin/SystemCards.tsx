import Link from "next/link";
import { ModuleIcon } from "./ModuleIcon";

import { visibleNav } from "@/lib/adminNav";
import { SYSTEM_META, TONES, systemHome, toneOfSystem } from "@/lib/adminSystems";

// The "choose a system" cards at the top of the dashboard. The systems are the website's own sidebar groups (same names, same
// pages), so no name appears here that the sidebar doesn't already have; each card opens that system's overview.
export type SystemCardId = string;

export function SystemCards({
  name,
  allowed,
  badges = {},
}: {
  name: string;
  // Which dashboard sections this admin may open (empty = all), so a card never leads somewhere they can't go.
  allowed: string[];
  badges?: Partial<Record<SystemCardId, number>>;
}) {
  const visible = visibleNav(allowed, false).groups;
  return (
    <section className="px-6 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#DCE5F7] bg-gradient-to-br from-white via-white to-[#E6EEFD] p-6 sm:p-8">
        <div>
          <h2 className="text-2xl font-bold text-[#0B1F4D] sm:text-3xl">Welcome Back, {name.split(" ")[0]}</h2>
          <p className="mt-1.5 text-sm text-[#4A5B80]">Select the system you want to work on</p>
        </div>
        <a href="#systems" className="rounded-full bg-[#1E5BD8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1B50BE]">
          Choose · Manage · Grow
        </a>
      </div>

      <div id="systems" className="mt-5 grid scroll-mt-4 grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {visible.map((c) => {
          const tone = TONES[toneOfSystem(c.id)];
          const badge = badges[c.id] ?? 0;
          return (
            <Link
              key={c.id}
              href={systemHome(c.id)}
              className="group flex flex-col gap-3 rounded-2xl border border-[#DCE5F7] bg-white p-5 shadow-[0_1px_2px_rgba(11,42,107,0.04),0_6px_18px_rgba(30,91,216,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: tone.tile, color: tone.text }}>
                <ModuleIcon name={c.icon} size={24} />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E5383B] px-1 text-[11px] font-bold text-white">{badge > 99 ? "99+" : badge}</span>
                )}
              </span>
              <span>
                <span className="block text-[15px] font-semibold leading-snug text-[#0B1F4D]">{c.label}</span>
                <span className="mt-0.5 block text-xs text-[#4A5B80]">{SYSTEM_META[c.id]?.text}</span>
              </span>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-[#1E5BD8]">
                Open
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
