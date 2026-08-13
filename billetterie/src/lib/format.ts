import type { Locale } from "@/i18n/config";
const code = (locale: Locale) => locale === "ar" ? "ar-TN" : "fr-FR";
export function formatMatchDateTime(date: Date, locale: Locale = "fr"): string { return new Intl.DateTimeFormat(code(locale), { weekday: "long", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(date); }
export function formatPriceTnd(price: string, locale: Locale = "fr"): string { return new Intl.NumberFormat(code(locale), { style: "currency", currency: "TND", minimumFractionDigits: 3 }).format(Number(price)); }
export function formatDateOnly(date: Date, locale: Locale = "fr"): string { return new Intl.DateTimeFormat(code(locale), { day: "2-digit", month: "long", year: "numeric", timeZone: "Africa/Tunis" }).format(date); }
