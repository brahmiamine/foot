import Link from "next/link";
import { ClubBadge } from "./ClubBadge";
import shared from "./shared.module.css";
import styles from "./Nav.module.css";

const LINKS = [
  { href: "/club", label: "Le club" },
  { href: "/calendrier", label: "Calendrier" },
  { href: "/actualites", label: "Actualités" },
  { href: "/#effectif", label: "Effectif" },
  { href: "/#classement", label: "Classement" },
  { href: "/formation", label: "Formation" },
  { href: "/galerie", label: "Galerie" },
  { href: "/boutique", label: "Boutique" },
  { href: "/partenaires", label: "Partenaires" },
  { href: "/contact", label: "Contact" },
];

export function Nav({ teamName }: { teamName: string }) {
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
              {link.label}
            </Link>
          ))}
        </div>
        <Link href="/espace-membre" className={styles.member}>
          Espace membre
        </Link>
        <Link href="/#billetterie" className={`${shared.btnPrimary} ${styles.cta}`}>
          Billetterie
        </Link>
      </div>
    </div>
  );
}
