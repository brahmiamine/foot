import { getTranslator } from "@/i18n/server";
import { getObTeam } from "@/lib/ob-team";
import { PublicAcademyService } from "@/services/PublicAcademyService";
import { getInscriptionUrl } from "@/lib/publicForms";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./formation.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Formation / Académie — Olympique de Béja",
};

export default async function FormationPage() {
  const { t } = await getTranslator();
  const team = await getObTeam();
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
            De l&apos;initiation U6 aux Seniors — détection, encadrement et formation des jeunes talents.
          </p>

          {categories.length > 0 && (
            <div className={styles.categoriesGrid}>
              {categories.map((category) => (
                <div key={category.id} className={`${shared.card} ${styles.categoryCard}`}>
                  <div className={styles.categoryCode}>{category.code}</div>
                  {category.ageRangeFr && <div className={styles.categoryAge}>{category.ageRangeFr}</div>}
                  <div className={styles.categoryName}>{category.nameFr}</div>
                </div>
              ))}
            </div>
          )}

          {info?.philosophyFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("academy.philosophy")}</div>
              <div className={styles.text}>{info.philosophyFr}</div>
            </div>
          )}
          {info?.methodFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("academy.method")}</div>
              <div className={styles.text}>{info.methodFr}</div>
            </div>
          )}
          {info?.supervisionFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("academy.staff")}</div>
              <div className={styles.text}>{info.supervisionFr}</div>
            </div>
          )}
          {info?.infrastructureFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("academy.infrastructure")}</div>
              <div className={styles.text}>{info.infrastructureFr}</div>
            </div>
          )}
          {info?.detectionFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("academy.scouting")}</div>
              <div className={styles.text}>{info.detectionFr}</div>
            </div>
          )}

          {!info && categories.length === 0 && (
            <p className={shared.empty}>{t("academy.empty")}</p>
          )}

          {inscriptionUrl && (
            <div className={styles.cta}>
              <a href={inscriptionUrl} className={shared.btnPrimary}>
                Inscrire mon enfant
              </a>
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
