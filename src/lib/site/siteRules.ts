// Validation for site settings, menus and social links. Pure, unit-tested; the server actions enforce it.
const SAFE_LINK = /^(\/|https?:\/\/|tel:|mailto:)/;
const SAFE_IMAGE = /^(\/|https?:\/\/|data:image\/(png|jpe?g|webp|gif|x-icon|vnd\.microsoft\.icon);base64,)/;

export const SOCIAL_PLATFORMS = ["facebook", "instagram", "linkedin", "tiktok", "youtube", "x", "whatsapp", "custom"] as const;
// Independent navigation menus. "header" is the top bar; "mobile" (when it has items) replaces the header menu on phones;
// "services" and "locations" are footer link columns; "footer" is the quick links.
export const MENUS = ["header", "services", "locations", "mobile", "footer"] as const;
export type MenuKey = (typeof MENUS)[number];

export const isSafeLink = (v: string) => SAFE_LINK.test(v.trim());

// A header item with this link becomes the "Areas We Cover" dropdown (filled from the Service Areas screen).
export const AREAS_MENU_URL = "#areas";

export type SettingsInput = {
  siteNameEn: string; siteNameAr: string; taglineEn: string; taglineAr: string; descriptionEn: string; descriptionAr: string;
  logoUrl: string; faviconUrl: string; defaultLocale: string; allowIndexing: boolean; copyrightEn: string; copyrightAr: string;
  phone: string; whatsapp: string; whatsappMessageEn: string; whatsappMessageAr: string; email: string;
  addressEn: string; addressAr: string; hoursEn: string; hoursAr: string; mapsUrl: string; businessProfileUrl: string;
  headerCtaLabelEn: string; headerCtaLabelAr: string; headerCtaUrl: string; footerAreas: { en: string; ar: string }[];
  // WhatsApp chat pop-up
  waPopupEnabled: boolean; waPopupAutoOpen: boolean; waPopupDelaySeconds: number;
  waPopupTitleEn: string; waPopupTitleAr: string; waPopupTextEn: string; waPopupTextAr: string; waPopupButtonEn: string; waPopupButtonAr: string;
};

export function settingsProblem(s: SettingsInput): string | null {
  if (!s.siteNameEn.trim() || !s.siteNameAr.trim()) return "Site name is required in English and Arabic.";
  if (!["en", "ar"].includes(s.defaultLocale)) return "Default language must be English or Arabic.";
  if (s.whatsapp && !/^\d{8,15}$/.test(s.whatsapp)) return "WhatsApp number must be digits only with the country code, e.g. 971568676036.";
  if (s.phone && !/^[+\d][\d\s()-]{5,24}$/.test(s.phone)) return "Phone number looks invalid.";
  if (s.waPopupEnabled && !s.whatsapp) return "Enter the WhatsApp number (Contact section) to show the WhatsApp chat pop-up, or switch the pop-up off.";
  if (!Number.isInteger(s.waPopupDelaySeconds) || s.waPopupDelaySeconds < 0 || s.waPopupDelaySeconds > 120) return "The pop-up delay must be a whole number of seconds from 0 to 120.";
  if ([s.waPopupTitleEn, s.waPopupTitleAr, s.waPopupButtonEn, s.waPopupButtonAr].some((x) => x.length > 80) || [s.waPopupTextEn, s.waPopupTextAr].some((x) => x.length > 300)) return "Pop-up titles and buttons can be up to 80 characters, the message up to 300.";
  if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) return "Email address looks invalid.";
  for (const [label, v] of [["Maps link", s.mapsUrl], ["Business profile link", s.businessProfileUrl]] as const) {
    if (v && !/^https?:\/\//.test(v)) return `${label} must start with https://`;
  }
  if (s.headerCtaUrl && !isSafeLink(s.headerCtaUrl)) return "Header button link must be a site path (/…), https:// link, tel: or mailto:.";
  for (const [label, v] of [["Logo", s.logoUrl], ["Favicon", s.faviconUrl]] as const) {
    if (v && !SAFE_IMAGE.test(v)) return `${label} must be an uploaded image or an https:// / site-path URL.`;
    if (v.length > 400_000) return `${label} file is too large. Use a smaller image.`;
  }
  if (s.footerAreas.length > 20 || s.footerAreas.some((a) => !a.en.trim() || !a.ar.trim())) return "Each footer area needs an English and Arabic name (max 20).";
  return null;
}

export type MenuItemInput = {
  labelEn: string; labelAr: string; url: string; visible: boolean; showDesktop: boolean; showMobile: boolean; newTab: boolean;
  children: MenuItemInput[];
};

export function menuProblem(items: MenuItemInput[]): string | null {
  let count = 0;
  const check = (list: MenuItemInput[], depth: number): string | null => {
    for (const item of list) {
      count++;
      if (!item.labelEn.trim() || !item.labelAr.trim()) return "Every menu item needs an English and Arabic label.";
      if (item.url.trim() === AREAS_MENU_URL) {
        if (depth > 1) return "\"Areas We Cover\" can only be a top-level item.";
        if (item.children.some((c) => c.url.trim() === AREAS_MENU_URL)) return "\"Areas We Cover\" can't be nested.";
      } else if (!item.url.trim()) {
        // A top-level item may have no link when it is a heading for a dropdown; it then needs sub-items to be useful.
        if (depth > 1 || item.children.length === 0) return `"${item.labelEn || "Item"}" needs a link, or sub-items if it is only a heading.`;
      } else if (!isSafeLink(item.url)) return `"${item.labelEn || "Item"}" needs a valid link (/path, https://, tel: or mailto:).`;
      if (item.children.length) {
        if (depth >= 2) return "Menus can only be two levels deep.";
        const nested = check(item.children, depth + 1);
        if (nested) return nested;
      }
    }
    return null;
  };
  const error = check(items, 1);
  if (error) return error;
  return count > 40 ? "A menu can have at most 40 items." : null;
}

export function socialProblem(l: { platform: string; url: string; label: string }): string | null {
  if (!(SOCIAL_PLATFORMS as readonly string[]).includes(l.platform)) return "Unknown platform.";
  if (!/^https:\/\//.test(l.url.trim())) return "Social links must start with https://";
  if (l.platform === "custom" && !l.label.trim()) return "Custom links need a name.";
  return null;
}

// "Book a service" WhatsApp link with the message pre-filled (single place that builds it).
export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
