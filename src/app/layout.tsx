import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "OSTA Services",
  description: "OSTA Services ERP",
  // The favicon chosen in the admin, as small PNGs (see src/lib/favicon.ts).
  icons: { icon: [{ url: "/favicon.ico", sizes: "48x48", type: "image/png" }, { url: "/icon", sizes: "192x192", type: "image/png" }], apple: "/apple-icon" },
};

export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
