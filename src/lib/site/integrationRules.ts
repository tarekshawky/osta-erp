// Integration IDs are placed into page scripts and meta tags, so they are validated against the exact shape each
// provider uses. Anything else is refused -- an ID field must never become a way to inject script.
export type IntegrationInput = {
  ga4Id: string; gtmId: string; metaPixelId: string; searchConsoleToken: string; bingToken: string;
  requireConsent: boolean; consentTextEn: string; consentTextAr: string; privacyUrl: string;
};

export const ID_PATTERNS = {
  ga4Id: /^G-[A-Z0-9]{4,14}$/,
  gtmId: /^GTM-[A-Z0-9]{4,10}$/,
  metaPixelId: /^\d{8,20}$/,
  searchConsoleToken: /^[A-Za-z0-9_-]{10,100}$/,
  bingToken: /^[A-Fa-f0-9]{16,64}$/,
} as const;

export const ID_HELP: Record<keyof typeof ID_PATTERNS, string> = {
  ga4Id: "like G-ABC123XYZ4",
  gtmId: "like GTM-ABC123",
  metaPixelId: "digits only, like 123456789012345",
  searchConsoleToken: "the content value from Google's HTML-tag verification",
  bingToken: "the hex code from Bing's meta-tag verification",
};

export function integrationProblem(i: IntegrationInput): string | null {
  for (const key of Object.keys(ID_PATTERNS) as (keyof typeof ID_PATTERNS)[]) {
    const v = i[key].trim();
    if (v && !ID_PATTERNS[key].test(v)) return `${labelOf(key)} must look ${ID_HELP[key]}.`;
  }
  if (i.privacyUrl.trim() && !/^(\/|https:\/\/)/.test(i.privacyUrl.trim())) return "Privacy policy link must be a site path (/…) or an https:// address.";
  if (i.consentTextEn.length > 400 || i.consentTextAr.length > 400) return "Consent message must be 400 characters or fewer.";
  return null;
}

const labelOf = (k: keyof typeof ID_PATTERNS) =>
  ({ ga4Id: "Google Analytics 4 ID", gtmId: "Google Tag Manager ID", metaPixelId: "Meta Pixel ID", searchConsoleToken: "Search Console token", bingToken: "Bing token" })[k];

// Which integrations need a consent choice before they may run. Search Console/Bing verification are plain meta tags
// that set no cookies, so they never need consent.
export function needsConsent(i: Pick<IntegrationInput, "ga4Id" | "gtmId" | "metaPixelId">): { analytics: boolean; marketing: boolean } {
  return { analytics: !!(i.ga4Id.trim() || i.gtmId.trim()), marketing: !!i.metaPixelId.trim() };
}
