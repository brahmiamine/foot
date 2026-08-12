import { getTranslator } from "@/i18n/server";
import { getObTeam } from "@/lib/ob-team";
import { PublicContactService } from "@/services/PublicContactService";
import { PublicTeamSocialsService } from "@/services/PublicTeamSocialsService";
import { getContactFormUrl } from "@/lib/publicForms";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./contact.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contact — Olympique de Béja",
};

export default async function ContactPage() {
  const { t } = await getTranslator();
  const team = await getObTeam();
  const [info, socials] = team
    ? await Promise.all([new PublicContactService().getInfo(team.id), new PublicTeamSocialsService().get(team.id)])
    : [null, null];
  const contactFormUrl = team ? getContactFormUrl(team.id) : null;

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
            {t("contact.title")}
          </h1>

          <div className={styles.grid}>
            <div className={`${shared.card} ${styles.card}`}>
              {info?.addressFr && (
                <div className={styles.row}>
                  <i className="fas fa-map-marker-alt" aria-hidden="true" />
                  <span>{info.addressFr}</span>
                </div>
              )}
              {info?.phone && (
                <div className={styles.row}>
                  <i className="fas fa-phone" aria-hidden="true" />
                  <span>{info.phone}</span>
                </div>
              )}
              {info?.email && (
                <div className={styles.row}>
                  <i className="fas fa-envelope" aria-hidden="true" />
                  <span>{info.email}</span>
                </div>
              )}
              {info?.openingHoursFr && (
                <div className={styles.row}>
                  <i className="fas fa-clock" aria-hidden="true" />
                  <span>{info.openingHoursFr}</span>
                </div>
              )}
              {!info && <p className={shared.empty}>{t("contact.empty")}</p>}

              {(info?.adminPhone || info?.adminEmail) && (
                <div className={styles.department}>
                  <div className={styles.departmentLabel}>{t("contact.admin")}</div>
                  <div>{info.adminPhone}</div>
                  <div>{info.adminEmail}</div>
                </div>
              )}
              {(info?.sportPhone || info?.sportEmail) && (
                <div className={styles.department}>
                  <div className={styles.departmentLabel}>{t("contact.sport")}</div>
                  <div>{info.sportPhone}</div>
                  <div>{info.sportEmail}</div>
                </div>
              )}
              {(info?.academyPhone || info?.academyEmail) && (
                <div className={styles.department}>
                  <div className={styles.departmentLabel}>{t("contact.academy")}</div>
                  <div>{info.academyPhone}</div>
                  <div>{info.academyEmail}</div>
                </div>
              )}
              {(info?.partnershipPhone || info?.partnershipEmail) && (
                <div className={styles.department}>
                  <div className={styles.departmentLabel}>{t("contact.partnerships")}</div>
                  <div>{info.partnershipPhone}</div>
                  <div>{info.partnershipEmail}</div>
                </div>
              )}

              {(socials?.facebookUrl || socials?.instagramUrl || socials?.tiktokUrl || socials?.youtubeUrl || socials?.xUrl) && (
                <div className={styles.socials}>
                  {socials.facebookUrl && (
                    <a href={socials.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook">
                      <i className="fab fa-facebook" aria-hidden="true" />
                    </a>
                  )}
                  {socials.instagramUrl && (
                    <a href={socials.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram">
                      <i className="fab fa-instagram" aria-hidden="true" />
                    </a>
                  )}
                  {socials.tiktokUrl && (
                    <a href={socials.tiktokUrl} target="_blank" rel="noreferrer" aria-label="TikTok">
                      <i className="fab fa-tiktok" aria-hidden="true" />
                    </a>
                  )}
                  {socials.youtubeUrl && (
                    <a href={socials.youtubeUrl} target="_blank" rel="noreferrer" aria-label="YouTube">
                      <i className="fab fa-youtube" aria-hidden="true" />
                    </a>
                  )}
                  {socials.xUrl && (
                    <a href={socials.xUrl} target="_blank" rel="noreferrer" aria-label="X">
                      <i className="fab fa-x-twitter" aria-hidden="true" />
                    </a>
                  )}
                </div>
              )}

              {info?.mapEmbedUrl && <iframe src={info.mapEmbedUrl} loading="lazy" title={t("contact.map")} className={styles.map} />}
            </div>

            <div className={`${shared.card} ${styles.formCard}`}>
              <p>{t("contact.prompt")}</p>
              {contactFormUrl ? (
                <a href={contactFormUrl} className={shared.btnPrimary}>
                  Envoyer un message
                </a>
              ) : (
                info?.email && (
                  <a href={`mailto:${info.email}`} className={shared.btnPrimary}>
                    Envoyer un email
                  </a>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </PageChrome>
  );
}
