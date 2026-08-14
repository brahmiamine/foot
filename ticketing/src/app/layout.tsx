import type { Metadata } from "next";
import { getTranslator } from "@/i18n/server";
import { I18nProvider } from "@/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> { const { t } = await getTranslator(); return { title: t("site.title"), description: t("site.description") }; }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getTranslator();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body><I18nProvider locale={locale}><LanguageSwitcher />{children}</I18nProvider></body>
    </html>
  );
}
