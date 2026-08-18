import { getLocalizedMetadata, getTranslator } from "@/i18n/server";
import { getObTeam } from "@/lib/ob-team";
import { assertSectionEnabled } from "@/lib/publicContentPolicy";
import { PublicAcademyService } from "@/services/PublicAcademyService";
import { getRecruitmentUrl } from "@/lib/publicForms";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./recrutement.module.css";
import { localized } from "@/i18n/localized";

export const dynamic = "force-dynamic";

export const generateMetadata = () => getLocalizedMetadata("metadata.recruitment");

export default async function RecrutementPage() {
  const { locale, t } = await getTranslator();
  const team = await getObTeam();
  await assertSectionEnabled(team?.id, "RECRUITMENT");
  const needs = team ? await new PublicAcademyService().getActiveRecruitmentNeeds(team.id) : [];
  const recruitmentUrl = team ? getRecruitmentUrl(team.id) : null;

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            {t("recruitment.title")}
          </h1>
          <p className={shared.sectionSubtitle} style={{ marginBottom: 28, display: "block" }}>
            {t("recruitment.subtitle")}
          </p>

          {needs.length === 0 ? (
            <p className={shared.empty}>{t("recruitment.empty")}</p>
          ) : (
            <div className={styles.grid}>
              {needs.map((need) => (
                <div key={need.id} className={`${shared.card} ${styles.card}`}>
                  <div className={styles.category}>{need.category}</div>
                  <div className={styles.position}>{need.position}</div>
                  {localized(locale, need.descriptionFr, need.descriptionAr) && (
                    <div className={styles.description}>{localized(locale, need.descriptionFr, need.descriptionAr)}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {recruitmentUrl && (
            <div className={styles.cta}>
              <a href={recruitmentUrl} className={shared.btnPrimary}>
                {t("recruitment.apply")}
              </a>
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
