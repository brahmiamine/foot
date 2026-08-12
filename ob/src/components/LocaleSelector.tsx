"use client";

import { useState, useTransition } from "react";
import type { NotificationLocale } from "@/lib/notificationApi";
import { setNotificationLocaleAction } from "@/app/espace-membre/actions";
import { useI18n } from "@/i18n/I18nProvider";

const OPTIONS: { value: NotificationLocale; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
];

export function LocaleSelector({ initialLocale }: { initialLocale: NotificationLocale }) {
  const { t } = useI18n();
  const [locale, setLocale] = useState(initialLocale);
  const [isPending, startTransition] = useTransition();

  const onChange = (value: NotificationLocale) => {
    setLocale(value);
    startTransition(async () => {
      await setNotificationLocaleAction(value);
    });
  };

  return (
    <select
      aria-label={t("member.notificationLanguage")}
      value={locale}
      disabled={isPending}
      onChange={(e) => onChange(e.target.value as NotificationLocale)}
      style={{
        background: "var(--ob-card-bg)",
        border: "1px solid var(--ob-card-border)",
        color: "var(--ob-text)",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 14,
      }}
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
