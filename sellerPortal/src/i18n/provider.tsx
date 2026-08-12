"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createTranslator, type Locale, type TranslationKey, type TranslationValues } from "./index";
type I18nContextValue = { locale: Locale; t: (key: TranslationKey, values?: TranslationValues) => string };
const I18nContext = createContext<I18nContextValue | null>(null);
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: createTranslator(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
