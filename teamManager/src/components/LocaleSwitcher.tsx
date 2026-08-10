"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { localeCookieName, locales, type Locale } from "@/i18n/config";

const LABELS: Record<Locale, string> = {
  fr: "FR",
  ar: "AR",
};

interface LocaleSwitcherProps {
  className?: string;
  variant?: "admin" | "public";
}

/**
 * Toggles the `foot_locale` cookie (no localized routing — every URL stays
 * as-is) and refreshes the current route so the server re-renders with the
 * new locale's messages.
 */
export function LocaleSwitcher({ className, variant = "admin" }: LocaleSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  const baseClass =
    variant === "admin"
      ? "btn-group btn-group-sm locale-switcher"
      : "locale-switcher locale-switcher-public";

  return (
    <div className={`${baseClass} ${className ?? ""}`} role="group" aria-label="Langue / اللغة">
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          disabled={isPending}
          onClick={() => switchTo(code)}
          className={
            variant === "admin"
              ? `btn btn-sm ${locale === code ? "btn-primary" : "btn-outline-secondary"}`
              : `locale-switcher-btn ${locale === code ? "active" : ""}`
          }
          aria-current={locale === code}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
