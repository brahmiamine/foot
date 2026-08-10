"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "fr" | "ar";

interface LanguageContextValue {
  lang: Lang;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({ lang: "fr", toggle: () => {} });

/**
 * État tenu en mémoire (pas de localStorage) : le kiosque reste ouvert sur
 * une session continue, LanguageProvider n'étant monté qu'une fois dans le
 * layout racine — la langue survit à la navigation tant que la page n'est
 * pas rechargée.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("fr");

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((prev) => (prev === "fr" ? "ar" : "fr"));
  }, []);

  const value = useMemo(() => ({ lang, toggle }), [lang, toggle]);

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
