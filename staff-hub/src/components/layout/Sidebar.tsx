"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canClient, type ClientAccess } from "@/lib/access-client";
import { useI18n } from "@/i18n/I18nProvider";
import type { TranslationKey } from "@/i18n/dictionaries";

interface NavItem { labelKey: TranslationKey; href: string; icon: string; permission?: string; }
const items: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/", icon: "◧" }, { labelKey: "nav.roster", href: "/effectif", icon: "👥", permission: "players.view" },
  { labelKey: "nav.calendar", href: "/calendrier", icon: "📅" }, { labelKey: "nav.trainings", href: "/entrainements", icon: "🏃", permission: "trainings.view" },
  { labelKey: "nav.attendance", href: "/presences", icon: "✅", permission: "trainings.view" }, { labelKey: "nav.matches", href: "/matchs", icon: "⚽", permission: "matches.view" },
  { labelKey: "nav.callups", href: "/convocations", icon: "✉", permission: "convocations.view" }, { labelKey: "nav.lineup", href: "/composition", icon: "📋", permission: "lineups.view" },
  { labelKey: "nav.tactics", href: "/tactique", icon: "♟", permission: "tactics.view" }, { labelKey: "nav.statistics", href: "/statistiques", icon: "📊", permission: "stats.view" },
  { labelKey: "nav.trips", href: "/deplacements", icon: "🚌", permission: "trips.view" }, { labelKey: "nav.license", href: "/licence", icon: "🪪" }, { labelKey: "nav.notifications", href: "/notifications", icon: "🔔" },
];

export function Sidebar({ clubName, clubLogoUrl, access }: { clubName?: string; clubLogoUrl?: string | null; access: ClientAccess; }) {
  const pathname = usePathname(); const { t } = useI18n(); const visibleItems = items.filter((item) => canClient(access, item.permission));
  return <aside style={{ width: 240, flexShrink: 0, background: "var(--sh-sidebar-bg)", color: "var(--sh-sidebar-text)", minHeight: "100vh", padding: "1.25rem 0.85rem", position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh", overflowY: "auto" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 0.4rem 1.5rem" }}>{clubLogoUrl ? <>{/* eslint-disable-next-line @next/next/no-img-element -- logo distant fourni par le club */}<img src={clubLogoUrl} alt="" width={34} height={34} style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0 }} /></> : <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--sh-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", flexShrink: 0 }}>SH</div>}<div><div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>{t("app.name")}</div><div style={{ fontSize: "0.68rem", color: "var(--sh-sidebar-text)" }}>{clubName ?? ""}</div></div></div>
    <nav>{visibleItems.map((item) => { const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href)); return <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.55rem 0.65rem", borderRadius: 8, fontSize: "0.86rem", fontWeight: active ? 700 : 500, color: active ? "var(--sh-sidebar-text-active)" : "var(--sh-sidebar-text)", background: active ? "var(--sh-sidebar-active-bg)" : "transparent", marginBottom: 2 }}><span aria-hidden style={{ width: 18, textAlign: "center" }}>{item.icon}</span>{t(item.labelKey)}</Link>; })}</nav>
  </aside>;
}
