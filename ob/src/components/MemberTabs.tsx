"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./MemberTabs.module.css";

const TABS = [
  { href: "/espace-membre", label: "Profil" },
  { href: "/espace-membre/notifications", label: "Notifications" },
  { href: "/espace-membre/preferences", label: "Préférences" },
  { href: "/espace-membre/billets", label: "Mes billets" },
  { href: "/espace-membre/commandes", label: "Mes commandes" },
];

export function MemberTabs({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  return (
    <nav className={styles.tabs}>
      {TABS.map((tab) => {
        const active = tab.href === "/espace-membre" ? pathname === tab.href : pathname?.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`${styles.tab} ${active ? styles.tabActive : ""}`}>
            {tab.label}
            {tab.href === "/espace-membre/notifications" && unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
