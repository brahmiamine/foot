import Link from "next/link";
import { ClubBadge } from "./ClubBadge";
import shared from "./shared.module.css";
import styles from "./Nav.module.css";
import { getTranslator } from "@/i18n/server";
import type { TranslationKey } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "./LanguageSwitcher";

const LINKS: { href: string; key: TranslationKey }[] = [
  { href: "/club", key: "nav.club" }, { href: "/calendrier", key: "nav.calendar" },
  { href: "/actualites", key: "nav.news" }, { href: "/#effectif", key: "nav.squad" },
  { href: "/#classement", key: "nav.standings" }, { href: "/formation", key: "nav.academy" },
  { href: "/galerie", key: "nav.gallery" }, { href: "/boutique", key: "nav.shop" },
  { href: "/partenaires", key: "nav.partners" }, { href: "/contact", key: "nav.contact" },
];

export async function Nav({ teamName }: { teamName: string }) {
  const { t } = await getTranslator();
  return (
    <div className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <ClubBadge teamName={teamName} className={styles.badge} />
          <div className={styles.name}>{teamName}</div>
        </Link>
        <div className={styles.links}>
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {t(link.key)}
            </Link>
          ))}
        </div>
        <Link href="/espace-membre" className={styles.member}>
          {t("nav.member")}
        </Link>
        <LanguageSwitcher />
        <Link href="/#ticketing" className={`${shared.btnPrimary} ${styles.cta}`}>
          {t("nav.tickets")}
        </Link>
      </div>
    </div>
  );
}
