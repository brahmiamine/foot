import "server-only";
import { cookies } from "next/headers";
import { translate, type TranslationKey } from "./dictionaries";
import { LANGUAGE_COOKIE, resolveLanguage } from "./locale";

export async function serverTranslate(key: TranslationKey, values?: Record<string, string | number>): Promise<string> {
  const lang = resolveLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value);
  return translate(lang, key, values);
}
