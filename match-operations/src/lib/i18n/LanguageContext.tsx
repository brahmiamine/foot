"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { translate, type TranslationKey } from "./dictionaries";
import { directionFor, LANGUAGE_COOKIE, type Lang } from "./locale";

export type { Lang } from "./locale";

interface LanguageContextValue {
  lang: Lang;
  toggle: () => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({ lang: "fr", toggle: () => {}, t: (key) => translate("fr", key) });

export function LanguageProvider({ children, initialLang }: { children: ReactNode; initialLang: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = directionFor(lang);
    document.cookie = `${LANGUAGE_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((prev) => (prev === "fr" ? "ar" : "fr"));
  }, []);

  const value = useMemo(() => ({ lang, toggle, t: (key: TranslationKey, values?: Record<string, string | number>) => translate(lang, key, values) }), [lang, toggle]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

/** Renvoie le nom arabe s'il existe et que la langue active est AR, sinon le nom FR. */
export function useLocalizedName(nameFr: string, nameAr?: string | null): string {
  const { lang } = useLanguage();
  if (lang === "ar" && nameAr) return nameAr;
  return nameFr;
}
