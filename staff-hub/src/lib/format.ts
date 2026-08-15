import type { Locale } from "@/i18n/config";

function intlLocale(locale: Locale) {
  return locale === "ar" ? "ar-TN" : "fr-FR";
}

function asDate(date: Date | string) {
  return typeof date === "string" ? new Date(date) : date;
}

export function formatDateTime(
  date: Date | string | null | undefined,
  locale: Locale = "fr",
): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(asDate(date));
}

export function formatDate(
  date: Date | string | null | undefined,
  locale: Locale = "fr",
): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(asDate(date));
}

export function formatShortDate(
  date: Date | string | null | undefined,
  locale: Locale = "fr",
): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(asDate(date));
}
