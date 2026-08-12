"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/provider";
import type { TranslationKey } from "@/i18n";

interface NavItem {
  label: TranslationKey;
  href: string;
}
interface NavSection {
  title?: TranslationKey;
  items: NavItem[];
}

const sections: NavSection[] = [
  { items: [{ label: "seller.nav.dashboard", href: "/dashboard" }] },
  {
    title: "seller.nav.catalog",
    items: [
      { label: "seller.nav.products", href: "/products" },
      { label: "seller.nav.categories", href: "/categories" },
      { label: "seller.nav.inventory", href: "/inventory" },
    ],
  },
  {
    title: "seller.nav.sales",
    items: [
      { label: "seller.nav.orders", href: "/orders" },
      { label: "seller.nav.returns", href: "/orders/returns" },
    ],
  },
  {
    title: "seller.nav.finance",
    items: [
      { label: "seller.nav.earnings", href: "/earnings" },
      { label: "seller.nav.payouts", href: "/payouts" },
    ],
  },
  { items: [{ label: "seller.nav.notifications", href: "/notifications" }] },
  {
    title: "seller.nav.settings",
    items: [
      { label: "seller.nav.profile", href: "/settings/profile" },
      { label: "seller.nav.account", href: "/settings/account" },
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
    "seller.nav.profile": "◐",
    Compte: "⚙",
  };
  return map[label] ?? "•";
}

export function Sidebar({ clubName, clubLogoUrl }: { clubName?: string; clubLogoUrl?: string | null }) {
  const pathname = usePathname();
  const { t } = useI18n();

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
        {clubLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo distant fourni par le club, pas un asset local optimisable
          <img
            src={clubLogoUrl}
            alt=""
            width={34}
            height={34}
            style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
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
              flexShrink: 0,
            }}
          >
            SP
          </div>
        )}
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>Seller Portal</div>
          <div style={{ fontSize: "0.68rem", color: "var(--sp-sidebar-text)" }}>
            Marketplace {clubName ?? ""}
          </div>
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
                {t(section.title)}
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
                  {t(item.label)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
