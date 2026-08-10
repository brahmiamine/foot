import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import "@/assets/scss/skote-theme.scss";

export const metadata: Metadata = {
  title: "SuperAdmin",
  description: "Outil interne de gestion du référentiel (fédérations, ligues, équipes, arbitres, matchs) et des comptes clubs.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={dir === "rtl" ? "rtl" : undefined} suppressHydrationWarning>
      <body data-sidebar="dark" data-sidebar-size="lg" data-layout="vertical" data-layout-mode="light">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
