import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookie, type Locale } from "./config";
import { createTranslator } from "./index";
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(localeCookie)?.value;
  return isLocale(value) ? value : defaultLocale;
}
export async function getTranslator() {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale) };
}
