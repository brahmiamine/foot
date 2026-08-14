import type { Locale } from "@/i18n/config";

function intlLocale(locale: Locale): string {
  return locale === "ar" ? "ar-TN" : "fr-FR";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMatchDateTime(date: Date, locale: Locale = "fr"): string {
  const day = capitalize(
    new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", timeZone: "Africa/Tunis" }).format(date),
  );
  const time = new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  }).format(date);
  return `${day} · ${time}`;
}

export function formatShortDate(date: Date, locale: Locale = "fr"): string {
  return capitalize(
    new Intl.DateTimeFormat(intlLocale(locale), {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Tunis",
    }).format(date),
  );
}

export function formatFullDateTime(date: Date, locale: Locale = "fr"): string {
  const time = new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  }).format(date);
  return `${formatShortDate(date, locale)} · ${time}`;
}

/** Product.price est stocké en `decimal` (donc en string côté TypeORM). */
export function formatPriceTnd(price: string, locale: Locale = "fr"): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
  }).format(Number(price));
}

export function calcAge(birthDate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}
