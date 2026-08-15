"use client";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

export function Topbar({ userName, roleLabel, onToggleMenu }: { userName: string; roleLabel: string; onToggleMenu?: () => void; }) {
  const { t } = useI18n();
  return <header style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--sh-surface)", borderBottom: "1px solid var(--sh-border)", padding: "0.85rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}><button onClick={onToggleMenu} aria-label={t("common.menu.open")} className="sh-menu-toggle" style={{ background: "none", border: "1px solid var(--sh-border)", borderRadius: 6, padding: "0.35rem 0.55rem", cursor: "pointer", display: "none" }}>☰</button><div><div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{userName}</div><div style={{ fontSize: "0.75rem", color: "var(--sh-text-muted)" }}>{roleLabel}</div></div></div>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}><LanguageSwitcher /><Link href="/notifications" aria-label={t("common.notifications")} style={{ fontSize: "1.1rem" }}>🔔</Link><form method="POST" action="/api/logout"><button type="submit" style={{ background: "var(--sh-surface-alt)", border: "1px solid var(--sh-border)", borderRadius: "var(--sh-radius-sm)", padding: "0.5rem 0.9rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>{t("common.logout")}</button></form></div>
  </header>;
}
