import { getLocalizedMetadata, getTranslator } from "@/i18n/server";
import { getObTeam } from "@/lib/ob-team";
import { assertSectionEnabled } from "@/lib/publicContentPolicy";
import { PublicAcademyService } from "@/services/PublicAcademyService";
import { getInscriptionUrl } from "@/lib/publicForms";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./formation.module.css";
import { localized } from "@/i18n/localized";

export const dynamic = "force-dynamic";

export const generateMetadata = () => getLocalizedMetadata("metadata.academy");

export default async function FormationPage() {
  const { locale, t } = await getTranslator();
  const team = await getObTeam();
  await assertSectionEnabled(team?.id, "FORMATION");
  const service = new PublicAcademyService();
  const [categories, info] = team
    ? await Promise.all([service.getCategories(team.id), service.getInfo(team.id)])
    : [[], null];

  const inscriptionUrl = team ? getInscriptionUrl(team.id) : null;

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            {t("academy.title")} / Académie
          </h1>
          <p className={shared.sectionSubtitle} style={{ marginBottom: 28, display: "block" }}>
            {t("academy.subtitle")}
          </p>

          {categories.length > 0 && (
            <div className={styles.categoriesGrid}>
              {categories.map((category) => (
                <div key={category.id} className={`${shared.card} ${styles.categoryCard}`}>
                  <div className={styles.categoryCode}>{category.code}</div>
                  {category.ageRangeFr && <div className={styles.categoryAge}>{category.ageRangeFr}</div>}
                  <div className={styles.categoryName}>{localized(locale, category.nameFr, category.nameAr)}</div>
                </div>
              ))}
            </div>
          )}

          {localized(locale, info?.philosophyFr, info?.philosophyAr) && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("academy.philosophy")}</div>
              <div className={styles.text}>{localized(locale, info?.philosophyFr, info?.philosophyAr)}</div>
            </div>
          )}
          {localized(locale, info?.methodFr, info?.methodAr) && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("academy.method")}</div>
              <div className={styles.text}>{localized(locale, info?.methodFr, info?.methodAr)}</div>
            </div>
          )}
          {localized(locale, info?.supervisionFr, info?.supervisionAr) && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("academy.staff")}</div>
              <div className={styles.text}>{localized(locale, info?.supervisionFr, info?.supervisionAr)}</div>
            </div>
          )}
          {localized(locale, info?.infrastructureFr, info?.infrastructureAr) && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("academy.infrastructure")}</div>
              <div className={styles.text}>{localized(locale, info?.infrastructureFr, info?.infrastructureAr)}</div>
            </div>
          )}
          {localized(locale, info?.detectionFr, info?.detectionAr) && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("academy.scouting")}</div>
              <div className={styles.text}>{localized(locale, info?.detectionFr, info?.detectionAr)}</div>
            </div>
          )}

          {!info && categories.length === 0 && (
            <p className={shared.empty}>{t("academy.empty")}</p>
          )}

          {inscriptionUrl && (
            <div className={styles.cta}>
              <a href={inscriptionUrl} className={shared.btnPrimary}>
                {t("academy.registerChild")}
              </a>
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
