"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { LOCALE_COOKIE_NAME, type Locale, locales } from "@/i18n/locales";

export default function LocaleSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const t = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(locale: Locale) {
    if (locale === currentLocale) return;
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="sso-locale-switcher" role="group" aria-label={t("language")}>
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={isPending}
          className={locale === currentLocale ? "sso-locale-active" : ""}
          onClick={() => switchLocale(locale)}
        >
          {locale === "fr" ? "FR" : "AR"}
        </button>
      ))}
      <style jsx>{`
        .sso-locale-switcher {
          position: absolute;
          top: 16px;
          inset-inline-end: 16px;
          display: flex;
          gap: 4px;
        }
        .sso-locale-switcher button {
          background: transparent;
          border: 1px solid var(--sso-border);
          color: var(--sso-muted);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }
        .sso-locale-switcher button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .sso-locale-switcher button.sso-locale-active {
          background: var(--sso-accent);
          border-color: var(--sso-accent);
          color: white;
        }
      `}</style>
    </div>
  );
}
