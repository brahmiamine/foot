import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookieName, type Locale } from "./config";
import { translate, type TranslationKey, type TranslationValues } from "./dictionaries";
import type { Metadata } from "next";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(localeCookieName)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getTranslator() {
  const locale = await getLocale();
  return { locale, t: (key: TranslationKey, values?: TranslationValues) => translate(locale, key, values) };
}

export async function getLocalizedMetadata(titleKey?: TranslationKey): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: titleKey ? t(titleKey) : "Olympique de Béja",
    description: t("metadata.siteDescription"),
  };
}
