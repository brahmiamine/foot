import type { Locale } from "./config";
export function localized(locale: Locale, french: string, arabic?: string | null): string { return locale === "ar" && arabic ? arabic : french; }
