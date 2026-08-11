"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavItem {
  label: string;
  href: string;
}
interface NavSection {
  title?: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  { items: [{ label: "Dashboard", href: "/dashboard" }] },
  {
    title: "Catalogue",
    items: [
      { label: "Produits", href: "/products" },
      { label: "Catégories", href: "/categories" },
      { label: "Stock", href: "/inventory" },
    ],
  },
  {
    title: "Ventes",
    items: [
      { label: "Commandes", href: "/orders" },
      { label: "Retours", href: "/orders/returns" },
    ],
  },
  {
    title: "Finances",
    items: [
      { label: "Revenus", href: "/earnings" },
      { label: "Payouts", href: "/payouts" },
    ],
  },
  { items: [{ label: "Notifications", href: "/notifications" }] },
  {
    title: "Paramètres",
    items: [
      { label: "Profil vendeur", href: "/settings/profile" },
      { label: "Compte", href: "/settings/account" },
    ],
  },
];

function icon(label: string): ReactNode {
  const map: Record<string, string> = {
    Dashboard: "◧",
    Produits: "▤",
    Catégories: "▥",
    Stock: "▦",
    Commandes: "▧",
    Retours: "↺",
    Revenus: "◈",
    Payouts: "⛁",
    Notifications: "◔",
    "Profil vendeur": "◐",
    Compte: "⚙",
  };
  return map[label] ?? "•";
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--sp-sidebar-bg)",
        color: "var(--sp-sidebar-text)",
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
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: "var(--sp-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            color: "#fff",
          }}
        >
          SP
        </div>
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>Seller Portal</div>
          <div style={{ fontSize: "0.68rem", color: "var(--sp-sidebar-text)" }}>Marketplace du club</div>
        </div>
      </div>

      <nav>
        {sections.map((section, idx) => (
          <div key={idx} style={{ marginBottom: "1.1rem" }}>
            {section.title && (
              <div
                style={{
                  fontSize: "0.66rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#5f7268",
                  fontWeight: 700,
                  padding: "0 0.6rem 0.4rem",
                }}
              >
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
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
                    color: active ? "var(--sp-sidebar-text-active)" : "var(--sp-sidebar-text)",
                    background: active ? "var(--sp-sidebar-active-bg)" : "transparent",
                    marginBottom: 2,
                  }}
                >
                  <span aria-hidden style={{ width: 18, textAlign: "center" }}>
                    {icon(item.label)}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
