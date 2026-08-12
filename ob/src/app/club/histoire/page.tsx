import { getLocalizedMetadata, getTranslator } from "@/i18n/server";
import { getObTeam } from "@/lib/ob-team";
import { PublicClubService } from "@/services/PublicClubService";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./histoire.module.css";
import { localized } from "@/i18n/localized";

export const dynamic = "force-dynamic";

export const generateMetadata = () => getLocalizedMetadata("metadata.history");

const FIGURE_CATEGORY_LABELS = { PRESIDENT: "history.presidents", COACH: "history.coaches", PLAYER: "history.figures", TEAM: "history.teams" } as const;

const FIGURE_CATEGORY_ORDER = ["PRESIDENT", "COACH", "PLAYER", "TEAM"];

export default async function HistoirePage() {
  const { locale, t } = await getTranslator();
  const team = await getObTeam();
  const service = new PublicClubService();
  const [history, honors, figures] = team
    ? await Promise.all([service.getHistory(team.id), service.getHonors(team.id), service.getFigures(team.id)])
    : [null, [], []];

  const foundedYear = history?.foundedDate ? new Date(history.foundedDate).getFullYear() : null;

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            {t("history.title")}
          </h1>
          {foundedYear && <div className={styles.founded}>{t("history.founded", { year: foundedYear })}</div>}

          {localized(locale, history?.storyFr, history?.storyAr) ? (
            <div className={styles.story}>{localized(locale, history?.storyFr, history?.storyAr)}</div>
          ) : (
            <p className={shared.empty}>{t("history.empty")}</p>
          )}

          {honors.length > 0 && (
            <>
              <h2 className={shared.sectionTitle} style={{ fontSize: 24, marginBottom: 20 }}>
                {t("history.honors")}
              </h2>
              <div className={styles.honorsGrid}>
                {honors.map((honor) => (
                  <div key={honor.id} className={`${shared.card} ${styles.honorCard}`}>
                    {honor.icon && <div className={styles.honorIcon}>{honor.icon}</div>}
                    <div className={styles.honorCompetition}>{localized(locale, honor.competitionFr, honor.competitionAr)}</div>
                    <div className={styles.honorCount}>{t("history.titles", { count: honor.titleCount })}</div>
                    {honor.yearsFr && <div className={styles.honorYears}>{honor.yearsFr}</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {figures.length > 0 &&
            FIGURE_CATEGORY_ORDER.filter((category) => figures.some((f) => f.category === category)).map((category) => (
              <div key={category} className={styles.figuresGroup}>
                <div className={styles.figuresGroupTitle}>{t(FIGURE_CATEGORY_LABELS[category as keyof typeof FIGURE_CATEGORY_LABELS])}</div>
                <div className={styles.figuresGrid}>
                  {figures
                    .filter((f) => f.category === category)
                    .map((figure) => (
                      <div key={figure.id} className={`${shared.card} ${styles.figureCard}`}>
                        <div className={styles.figureName}>{localized(locale, figure.nameFr, figure.nameAr)}</div>
                        {figure.periodFr && <div className={styles.figurePeriod}>{figure.periodFr}</div>}
                        {localized(locale, figure.descriptionFr, figure.descriptionAr) && <div className={styles.figureDescription}>{localized(locale, figure.descriptionFr, figure.descriptionAr)}</div>}
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </PageChrome>
  );
}
