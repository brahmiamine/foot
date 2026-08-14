"use client";
import { useRouter } from "next/navigation";
import { localeCookie, locales, type Locale } from "./config";
import { useI18n } from "./provider";
export function LanguageSelector() {
  const { locale, t } = useI18n(); const router = useRouter();
  function change(next: Locale) { document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`; router.refresh(); }
  return <label className="language-selector"><span className="sr-only">{t("language.label")}</span><select aria-label={t("language.label")} value={locale} onChange={(e) => change(e.target.value as Locale)}>{locales.map((item) => <option key={item} value={item}>{t(`language.${item}` as "language.fr" | "language.ar")}</option>)}</select></label>;
}
