// Security headers for the admin app. Only what is safe to enforce on every page: nothing here restricts scripts or device features
// (the page editor, the employee app's photos and GPS, and the rich-text editor rely on them).

export type Header = { key: string; value: string };

export const securityHeaders = (): Header[] => [
  // object-src / base-uri: no plug-ins and no injected <base>; frame-ancestors: nobody else may frame the admin (clickjacking)
  { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];
