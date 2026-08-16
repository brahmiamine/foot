import type { Viewport } from "next";
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getLocale, getLocalizedMetadata } from "@/i18n/server";
import "../../../packages/design-tokens/src/index.css";
import "./globals.css";
import "./design-system.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

export async function generateMetadata() {
  return {
    ...(await getLocalizedMetadata()),
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icons/icon-192x192.png", apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#c8102e",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${barlowCondensed.variable} ${sourceSans.variable}`}>
      <body>
        <I18nProvider locale={locale}>
          {children}
          <ServiceWorkerRegistration />
          <PwaInstallPrompt />
        </I18nProvider>
      </body>
    </html>
  );
}
