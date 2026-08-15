import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookieName } from "./config";
import { translate, type TranslationKey } from "./dictionaries";

export async function getLocale() {
  const value = (await cookies()).get(localeCookieName)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getTranslator() {
  const locale = await getLocale();
  return { locale, t: (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values) };
}
