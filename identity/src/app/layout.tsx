import type { Metadata } from "next";
import { I18nProvider } from "@/i18n/provider";
import { LanguageSelector } from "@/i18n/LanguageSelector";
import { getTranslator } from "@/i18n/server";
import "../../../packages/design-tokens/src/index.css";
import "./globals.css";
import "./design-system.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("app.metadata.title"), description: t("app.metadata.description") };
}
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale } = await getTranslator();
  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}><body><I18nProvider locale={locale}><LanguageSelector />{children}</I18nProvider></body></html>;
}
