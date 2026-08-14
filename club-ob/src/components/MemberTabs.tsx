"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./MemberTabs.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import type { TranslationKey } from "@/i18n/dictionaries";

const TABS: { href: string; key: TranslationKey }[] = [
  { href: "/espace-membre", key: "member.profile" },
  { href: "/espace-membre/notifications", key: "member.notifications" },
  { href: "/espace-membre/preferences", key: "member.preferences" },
  { href: "/espace-membre/billets", key: "member.tickets" },
  { href: "/espace-membre/commandes", key: "member.orders" },
];

export function MemberTabs({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className={styles.tabs}>
      {TABS.map((tab) => {
        const active = tab.href === "/espace-membre" ? pathname === tab.href : pathname?.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`${styles.tab} ${active ? styles.tabActive : ""}`}>
            {t(tab.key)}
            {tab.href === "/espace-membre/notifications" && unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
