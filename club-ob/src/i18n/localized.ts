import type { Locale } from "./config";

/** Selects Arabic CMS content when available and safely falls back to French. */
export function localized(locale: Locale, french: string, arabic?: string | null): string;
export function localized(locale: Locale, french?: string | null, arabic?: string | null): string | null;
export function localized(locale: Locale, french?: string | null, arabic?: string | null): string | null {
  return locale === "ar" && arabic ? arabic : french ?? null;
}
