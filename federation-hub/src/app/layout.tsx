import type { Metadata } from "next";
import { cookies } from "next/headers";
import { TranslationProvider } from "@/lib/i18n";
import { getSuperadminDocumentAttributes, getSuperadminLocale } from "@/lib/federationHubLocale";
import "./globals.css";
import "@/assets/scss/skote-theme.scss";

const layoutMessages = {
  fr: { title: "Federation Hub", description: "Outil interne de gestion du référentiel (fédérations, ligues, équipes, arbitres, matchs) et des comptes clubs." },
  ar: { title: "الإدارة العامة", description: "أداة داخلية لإدارة الاتحادات والروابط والفرق والحكام والمباريات وحسابات الأندية." },
} as const;

async function readLocale() {
  return getSuperadminLocale((await cookies()).get("federation-hub_locale")?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readLocale();
  return { ...layoutMessages[locale], robots: { index: false, follow: false } };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { lang: locale, dir } = getSuperadminDocumentAttributes(
    (await cookies()).get("federation-hub_locale")?.value,
  );
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body data-sidebar="dark" data-sidebar-size="lg" data-layout="vertical" data-layout-mode="light">
        <TranslationProvider initialLocale={locale}>{children}</TranslationProvider>
      </body>
    </html>
  );
}
