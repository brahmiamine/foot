"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import { translate, type TranslationKey } from "./dictionaries";
const LocaleContext = createContext<Locale>("fr");
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) { return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>; }
export function useI18n() { const locale = useContext(LocaleContext); return { locale, t: (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values) }; }
