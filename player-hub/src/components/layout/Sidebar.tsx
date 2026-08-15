"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import type { TranslationKey } from "@/i18n/dictionaries";

interface NavItem { labelKey: TranslationKey; href: string; icon: string; }

const items: NavItem[] = [
  { labelKey: "nav.home", href: "/", icon: "◧" },
  { labelKey: "nav.calendar", href: "/calendrier", icon: "📅" },
  { labelKey: "nav.callups", href: "/convocations", icon: "✉" },
  { labelKey: "nav.trainings", href: "/entrainements", icon: "🏃" },
  { labelKey: "nav.matches", href: "/matchs", icon: "⚽" },
  { labelKey: "nav.statistics", href: "/statistiques", icon: "📊" },
  { labelKey: "nav.discipline", href: "/discipline", icon: "🟨" },
  { labelKey: "nav.trips", href: "/deplacements", icon: "🚌" },
  { labelKey: "nav.availability", href: "/disponibilite", icon: "🩺" },
  { labelKey: "nav.license", href: "/licence", icon: "🪪" },
  { labelKey: "nav.notifications", href: "/notifications", icon: "🔔" },
  { labelKey: "nav.profile", href: "/profil", icon: "👤" },
];

export function Sidebar({ clubName, clubLogoUrl }: { clubName?: string; clubLogoUrl?: string | null }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <aside style={{ width: 240, flexShrink: 0, background: "var(--ph-sidebar-bg)", color: "var(--ph-sidebar-text)", minHeight: "100vh", padding: "1.25rem 0.85rem", position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 0.4rem 1.5rem" }}>
        {clubLogoUrl ? <img src={clubLogoUrl} alt="" width={34} height={34} style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--ph-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", flexShrink: 0 }}>PH</div>}
        <div><div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>{t("app.name")}</div><div style={{ fontSize: "0.68rem", color: "var(--ph-sidebar-text)" }}>{clubName ?? ""}</div></div>
      </div>
      <nav>{items.map((item) => { const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href)); return <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.55rem 0.65rem", borderRadius: 8, fontSize: "0.86rem", fontWeight: active ? 700 : 500, color: active ? "var(--ph-sidebar-text-active)" : "var(--ph-sidebar-text)", background: active ? "var(--ph-sidebar-active-bg)" : "transparent", marginBottom: 2 }}><span aria-hidden style={{ width: 18, textAlign: "center" }}>{item.icon}</span>{t(item.labelKey)}</Link>; })}</nav>
    </aside>
  );
}
