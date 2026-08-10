"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function LanguageToggle() {
  const { lang, toggle } = useLanguage();

  return (
    <button type="button" className="matchsheet-lang-toggle" onClick={toggle} aria-label="Changer la langue / تغيير اللغة">
      {lang === "fr" ? "FR" : "AR"}
      <i className="bx bx-globe ms-1" aria-hidden="true" />
    </button>
  );
}
