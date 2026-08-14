"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canClient, type ClientAccess } from "@/lib/access-client";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission?: string;
}

const items: NavItem[] = [
  { label: "Tableau de bord", href: "/", icon: "◧", permission: "medical.view" },
  { label: "Joueurs indisponibles", href: "/indisponibles", icon: "🚫", permission: "medical.view" },
  { label: "Blessures en cours", href: "/blessures", icon: "🩹", permission: "medical.view" },
  { label: "Alertes", href: "/alertes", icon: "⚠", permission: "medical.view" },
  { label: "Disponibilités", href: "/disponibilites", icon: "✅", permission: "medical.view" },
  { label: "Documents", href: "/documents", icon: "📄", permission: "medical.view" },
  { label: "Historique", href: "/historique", icon: "🗂", permission: "medical.view" },
  { label: "Notifications", href: "/notifications", icon: "🔔" },
];

export function Sidebar({
  clubName,
  clubLogoUrl,
  access,
}: {
  clubName?: string;
  clubLogoUrl?: string | null;
  access: ClientAccess;
}) {
  const pathname = usePathname();
  const visibleItems = items.filter((item) => canClient(access, item.permission));

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--mh-sidebar-bg)",
        color: "var(--mh-sidebar-text)",
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
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "var(--mh-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            MH
          </div>
        )}
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>Espace Médical</div>
          <div style={{ fontSize: "0.68rem", color: "var(--mh-sidebar-text)" }}>{clubName ?? ""}</div>
        </div>
      </div>

      <nav>
        {visibleItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0.55rem 0.65rem",
                borderRadius: 8,
                fontSize: "0.86rem",
                fontWeight: active ? 700 : 500,
                color: active ? "var(--mh-sidebar-text-active)" : "var(--mh-sidebar-text)",
                background: active ? "var(--mh-sidebar-active-bg)" : "transparent",
                marginBottom: 2,
              }}
            >
              <span aria-hidden style={{ width: 18, textAlign: "center" }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
