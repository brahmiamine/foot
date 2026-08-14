"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { localeCookieName, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./LanguageSwitcher.module.css";

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const changeLocale = (nextLocale: Locale) => {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
    startTransition(() => router.refresh());
  };

  return (
    <label className={styles.wrapper}>
      <span className={styles.srOnly}>{t("language.label")}</span>
      <select value={locale} disabled={pending} onChange={(event) => changeLocale(event.target.value as Locale)}>
        <option value="fr">FR</option>
        <option value="ar">ع</option>
      </select>
    </label>
  );
}
