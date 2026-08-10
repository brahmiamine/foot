import Link from "next/link";
import shared from "./shared.module.css";
import styles from "./Nav.module.css";

const LINKS = [
  { href: "/calendrier", label: "Calendrier" },
  { href: "/actualites", label: "Actualités" },
  { href: "/#effectif", label: "Effectif" },
  { href: "/#classement", label: "Classement" },
  { href: "/#histoire", label: "Histoire" },
  { href: "/galerie", label: "Galerie" },
  { href: "/boutique", label: "Boutique" },
  { href: "/#contact", label: "Contact" },
];

export function Nav({ teamName, logoUrl }: { teamName: string; logoUrl?: string | null }) {
  return (
    <div className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <div className={styles.badge}>
            {/* eslint-disable-next-line @next/next/no-img-element -- petit badge, pas besoin de next/image */}
            {logoUrl ? <img src={logoUrl} alt={teamName} /> : "OB"}
          </div>
          <div className={styles.name}>{teamName}</div>
        </Link>
        <div className={styles.links}>
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
        <Link href="/#billetterie" className={`${shared.btnPrimary} ${styles.cta}`}>
          Billetterie
        </Link>
      </div>
    </div>
  );
}
