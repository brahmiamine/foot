import Link from "next/link";
import type { Stadium } from "@/entities/Stadium";
import { getSponsorRequestUrl } from "@/lib/sponsor";
import { PublicTeamSocialsService } from "@/services/PublicTeamSocialsService";
import { ClubBadge } from "./ClubBadge";
import styles from "./Footer.module.css";

export async function Footer({
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
  const socials = await new PublicTeamSocialsService().get(teamId);

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
            <Link href="/club">Le club</Link>
            <Link href="/club/histoire">Histoire</Link>
            <Link href="/formation">Formation</Link>
            <Link href="/#effectif">Effectif</Link>
            <Link href="/calendrier">Calendrier</Link>
            <Link href="/actualites">Actualités</Link>
            <Link href="/galerie">Galerie</Link>
            <Link href="/boutique">Boutique</Link>
          </div>
        </div>

        <div>
          <div className={styles.heading}>Le club et vous</div>
          <div className={styles.links}>
            <Link href="/communiques">Communiqués</Link>
            <Link href="/recrutement">Recrutement</Link>
            <Link href="/partenaires">Partenaires</Link>
            {sponsorUrl && <a href={sponsorUrl}>Devenir sponsor</a>}
            <Link href="/contact">Contact</Link>
          </div>
        </div>

        <div>
          <div className={styles.heading}>Suivez-nous</div>
          {socials?.facebookUrl || socials?.instagramUrl || socials?.tiktokUrl || socials?.youtubeUrl || socials?.xUrl ? (
            <div className={styles.links}>
              {socials.facebookUrl && (
                <a href={socials.facebookUrl} target="_blank" rel="noreferrer">
                  Facebook
                </a>
              )}
              {socials.instagramUrl && (
                <a href={socials.instagramUrl} target="_blank" rel="noreferrer">
                  Instagram
                </a>
              )}
              {socials.tiktokUrl && (
                <a href={socials.tiktokUrl} target="_blank" rel="noreferrer">
                  TikTok
                </a>
              )}
              {socials.youtubeUrl && (
                <a href={socials.youtubeUrl} target="_blank" rel="noreferrer">
                  YouTube
                </a>
              )}
              {socials.xUrl && (
                <a href={socials.xUrl} target="_blank" rel="noreferrer">
                  X (Twitter)
                </a>
              )}
            </div>
          ) : (
            <p className={styles.address}>Réseaux sociaux à venir.</p>
          )}
        </div>
      </div>
      <div className={styles.bottom}>© {new Date().getFullYear()} {teamName}. Tous droits réservés.</div>
    </div>
  );
}
