import Link from "next/link";
import type { Stadium } from "@/entities/Stadium";
import { getSponsorRequestUrl } from "@/lib/sponsor";
import { ClubBadge } from "./ClubBadge";
import styles from "./Footer.module.css";

export function Footer({
  teamId,
  teamName,
  stadium,
}: {
  teamId: string;
  teamName: string;
  stadium: Stadium | null;
}) {
  const address = [stadium?.nameFr, stadium?.addressFr, stadium?.cityFr].filter(Boolean).join(", ");
  const sponsorUrl = getSponsorRequestUrl(teamId);

  return (
    <div id="contact" className={styles.footer}>
      <div className={styles.grid}>
        <div>
          <div className={styles.brand}>
            <ClubBadge teamName={teamName} className={styles.badge} />
            <div className={styles.name}>{teamName}</div>
          </div>
          <div className={styles.address}>
            {address || "Béja, Tunisie"}. Club fondé en 1929, membre de la Fédération Tunisienne de Football.
          </div>
        </div>

        <div>
          <div className={styles.heading}>Le club</div>
          <div className={styles.links}>
            <Link href="/#histoire">Histoire</Link>
            <Link href="/#effectif">Effectif</Link>
            <Link href="/calendrier">Calendrier</Link>
            <Link href="/actualites">Actualités</Link>
            <Link href="/galerie">Galerie</Link>
            <Link href="/boutique">Boutique</Link>
            {sponsorUrl && <a href={sponsorUrl}>Devenir sponsor</a>}
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
