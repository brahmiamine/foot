import Link from "next/link";
import type { Stadium } from "@/entities/Stadium";
import { getSponsorRequestUrl } from "@/lib/sponsor";
import { PublicTeamSocialsService } from "@/services/PublicTeamSocialsService";
import { ClubBadge } from "./ClubBadge";
import styles from "./Footer.module.css";
import { getTranslator } from "@/i18n/server";
import { localized } from "@/i18n/localized";

export async function Footer({
  teamId,
  teamName,
  stadium,
}: {
  teamId: string;
  teamName: string;
  stadium: Stadium | null;
}) {
  const sponsorUrl = getSponsorRequestUrl(teamId);
  const socials = await new PublicTeamSocialsService().get(teamId);
  const { locale, t } = await getTranslator();
  const address = [
    localized(locale, stadium?.nameFr, stadium?.nameAr),
    localized(locale, stadium?.addressFr, stadium?.addressAr),
    localized(locale, stadium?.cityFr, stadium?.cityAr),
  ].filter(Boolean).join(", ");

  return (
    <div id="contact" className={styles.footer}>
      <div className={styles.grid}>
        <div>
          <div className={styles.brand}>
            <ClubBadge teamName={teamName} className={styles.badge} />
            <div className={styles.name}>{teamName}</div>
          </div>
          <div className={styles.address}>
            {t("footer.description", { address: address || "Béja, Tunisie" })}
          </div>
        </div>

        <div>
          <div className={styles.heading}>{t("footer.club")}</div>
          <div className={styles.links}>
            <Link href="/club">{t("nav.club")}</Link><Link href="/club/histoire">{t("footer.history")}</Link>
            <Link href="/formation">{t("nav.academy")}</Link><Link href="/#effectif">{t("nav.squad")}</Link>
            <Link href="/calendrier">{t("nav.calendar")}</Link><Link href="/actualites">{t("nav.news")}</Link>
            <Link href="/galerie">{t("nav.gallery")}</Link><Link href="/boutique">{t("nav.shop")}</Link>
          </div>
        </div>

        <div>
          <div className={styles.heading}>{t("footer.clubAndYou")}</div>
          <div className={styles.links}>
            <Link href="/communiques">{t("footer.releases")}</Link><Link href="/recrutement">{t("footer.recruitment")}</Link>
            <Link href="/partenaires">{t("nav.partners")}</Link>{sponsorUrl && <a href={sponsorUrl}>{t("footer.becomeSponsor")}</a>}
            <Link href="/contact">{t("nav.contact")}</Link>
          </div>
        </div>

        <div>
          <div className={styles.heading}>{t("footer.follow")}</div>
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
            <p className={styles.address}>{t("footer.socialSoon")}</p>
          )}
        </div>
      </div>
      <div className={styles.bottom}>© {new Date().getFullYear()} {teamName}. {t("footer.rights")}</div>
    </div>
  );
}
