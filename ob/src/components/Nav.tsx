import shared from "./shared.module.css";
import styles from "./Nav.module.css";

const LINKS = [
  { href: "#calendrier", label: "Calendrier" },
  { href: "#actus", label: "Actualités" },
  { href: "#effectif", label: "Effectif" },
  { href: "#classement", label: "Classement" },
  { href: "#histoire", label: "Histoire" },
  { href: "#galerie", label: "Galerie" },
  { href: "#contact", label: "Contact" },
];

export function Nav({ teamName, logoUrl }: { teamName: string; logoUrl?: string | null }) {
  return (
    <div className={styles.nav}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.badge}>
            {/* eslint-disable-next-line @next/next/no-img-element -- petit badge, pas besoin de next/image */}
            {logoUrl ? <img src={logoUrl} alt={teamName} /> : "OB"}
          </div>
          <div className={styles.name}>{teamName}</div>
        </div>
        <div className={styles.links}>
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
        <a href="#billetterie" className={shared.btnPrimary}>
          Billetterie
        </a>
      </div>
    </div>
  );
}
