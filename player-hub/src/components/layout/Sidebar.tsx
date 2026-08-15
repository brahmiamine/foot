"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const items: NavItem[] = [
  { label: "Accueil", href: "/", icon: "◧" },
  { label: "Mon calendrier", href: "/calendrier", icon: "📅" },
  { label: "Mes convocations", href: "/convocations", icon: "✉" },
  { label: "Mes entraînements", href: "/entrainements", icon: "🏃" },
  { label: "Mes matchs", href: "/matchs", icon: "⚽" },
  { label: "Mes statistiques", href: "/statistiques", icon: "📊" },
  { label: "Ma discipline", href: "/discipline", icon: "🟨" },
  { label: "Mes déplacements", href: "/deplacements", icon: "🚌" },
  { label: "Ma disponibilité", href: "/disponibilite", icon: "🩺" },
  { label: "Ma licence", href: "/licence", icon: "🪪" },
  { label: "Mes notifications", href: "/notifications", icon: "🔔" },
  { label: "Mon profil", href: "/profil", icon: "👤" },
];

export function Sidebar({ clubName, clubLogoUrl }: { clubName?: string; clubLogoUrl?: string | null }) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--ph-sidebar-bg)",
        color: "var(--ph-sidebar-text)",
        minHeight: "100vh",
        padding: "1.25rem 0.85rem",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        height: "100vh",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 0.4rem 1.5rem" }}>
        {clubLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo distant fourni par le club, pas un asset local optimisable
          <img src={clubLogoUrl} alt="" width={34} height={34} style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--ph-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", flexShrink: 0 }}>PH</div>
        )}
        <div><div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>Espace Joueur</div><div style={{ fontSize: "0.68rem", color: "var(--ph-sidebar-text)" }}>{clubName ?? ""}</div></div>
      </div>

      <nav>
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.55rem 0.65rem", borderRadius: 8, fontSize: "0.86rem", fontWeight: active ? 700 : 500, color: active ? "var(--ph-sidebar-text-active)" : "var(--ph-sidebar-text)", background: active ? "var(--ph-sidebar-active-bg)" : "transparent", marginBottom: 2 }}><span aria-hidden style={{ width: 18, textAlign: "center" }}>{item.icon}</span>{item.label}</Link>;
        })}
      </nav>
    </aside>
  );
}
