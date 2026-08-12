"use client";
import { createContext, useContext } from "react";
import type { Locale } from "./config";
import { translate, type TranslationKey, type TranslationValues } from "./dictionaries";
const Context = createContext<Locale>("fr");
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) { return <Context.Provider value={locale}>{children}</Context.Provider>; }
export function useI18n() { const locale = useContext(Context); return { locale, t: (key: TranslationKey, values?: TranslationValues) => translate(locale, key, values) }; }
