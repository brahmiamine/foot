import { intlLocales, type Locale } from "./config";
export const formatDate = (value: Date | string | number, locale: Locale, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) => new Intl.DateTimeFormat(intlLocales[locale], options).format(new Date(value));
export const formatNumber = (value: number, locale: Locale, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(intlLocales[locale], options).format(value);
export const formatCurrency = (value: number, locale: Locale, currency = "TND") => formatNumber(value, locale, { style: "currency", currency });
