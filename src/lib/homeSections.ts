// Fixed set of homepage section slots. Admins can edit each section's content and
// its items, but can't create new slots -- new sections require a code change to
// the marketing site's layout (src/app/HomeClient.tsx in osta-bookig-users) anyway,
// since each key gets its own visual treatment there.
export const HOME_SECTION_KEYS = [
  { key: "sustainability", label: "Sustainability" },
  { key: "booking", label: "Booking" },
  { key: "why-choose-ajman", label: "Why Choose Us (Ajman & Al Ain)" },
  { key: "why-choose", label: "Why Choose OSTA Services" },
  { key: "areas-we-cover", label: "Areas We Cover" },
  { key: "brands-we-service", label: "Brands We Service" },
  { key: "prime-membership", label: "OSTA Prime Membership" },
  { key: "achievements", label: "Our Achievements" },
] as const;

export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number]["key"];

export function labelForKey(key: string): string {
  return HOME_SECTION_KEYS.find((s) => s.key === key)?.label ?? key;
}
