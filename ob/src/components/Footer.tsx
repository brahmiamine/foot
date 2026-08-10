import type { Stadium } from "@/entities/Stadium";
import styles from "./Footer.module.css";

export function Footer({
  teamName,
  logoUrl,
  stadium,
}: {
  teamName: string;
  logoUrl?: string | null;
  stadium: Stadium | null;
}) {
  const address = [stadium?.nameFr, stadium?.addressFr, stadium?.cityFr].filter(Boolean).join(", ");

  return (
    <div id="contact" className={styles.footer}>
      <div className={styles.grid}>
        <div>
          <div className={styles.brand}>
            <div className={styles.badge}>
              {/* eslint-disable-next-line @next/next/no-img-element -- petit badge, pas besoin de next/image */}
              {logoUrl ? <img src={logoUrl} alt={teamName} /> : "OB"}
            </div>
            <div className={styles.name}>{teamName}</div>
          </div>
          <div className={styles.address}>
            {address || "Béja, Tunisie"}. Club fondé en 1929, membre de la Fédération Tunisienne de Football.
          </div>
        </div>

        <div>
          <div className={styles.heading}>Le club</div>
          <div className={styles.links}>
            <a href="#histoire">Histoire</a>
            <a href="#effectif">Effectif</a>
            <a href="#classement">Classement</a>
            <a href="#billetterie">Billetterie</a>
          </div>
        </div>

        <div>
          <div className={styles.heading}>Suivez-nous</div>
          {/* Comptes réseaux sociaux non confirmés — à renseigner par le club. */}
          <div className={styles.links}>
            <a href="#">Facebook</a>
            <a href="#">Instagram</a>
            <a href="#">X (Twitter)</a>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>© {new Date().getFullYear()} {teamName}. Tous droits réservés.</div>
    </div>
  );
}
