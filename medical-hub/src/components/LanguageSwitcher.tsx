"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { localeCookieName, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
export function LanguageSwitcher() { const { locale, t } = useI18n(); const router = useRouter(); const [pending, startTransition] = useTransition(); return <select aria-label={t("common.language.label")} value={locale} disabled={pending} onChange={(event) => { const next = event.target.value as Locale; document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000; samesite=lax`; startTransition(() => router.refresh()); }} style={{ background: "var(--mh-surface-alt)", border: "1px solid var(--mh-border)", borderRadius: "var(--mh-radius-sm)", padding: "0.45rem 0.5rem", fontSize: "0.8rem" }}><option value="fr">FR</option><option value="ar">ع</option></select>; }
