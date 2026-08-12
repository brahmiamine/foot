"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { localeCookieName, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
export function LanguageSwitcher() { const { locale, t } = useI18n(); const router = useRouter(); const [pending, startTransition] = useTransition(); return <label style={{ position: "fixed", insetBlockStart: 12, insetInlineEnd: 16, zIndex: 10 }}><span className="sr-only">{t("language.label")}</span><select aria-label={t("language.label")} value={locale} disabled={pending} onChange={(e) => { const next = e.target.value as Locale; document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000; samesite=lax`; startTransition(() => router.refresh()); }} style={{ padding: "0.4rem", border: "1px solid var(--tk-border)", borderRadius: 6, background: "var(--tk-surface)", color: "var(--tk-text)" }}><option value="fr">FR</option><option value="ar">ع</option></select></label>; }
