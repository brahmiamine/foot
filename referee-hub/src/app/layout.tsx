import type { Metadata, Viewport } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../../packages/design-tokens/src/index.css";
import "./globals.css";
import "./design-system.css";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Referee Hub · Espace Arbitre",
  description: "Désignations et informations opérationnelles personnelles des officiels de match.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#2a3042" };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
