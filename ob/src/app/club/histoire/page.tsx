import { getObTeam } from "@/lib/ob-team";
import { PublicClubService } from "@/services/PublicClubService";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./histoire.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Histoire du club — Olympique de Béja",
};

const FIGURE_CATEGORY_LABELS: Record<string, string> = {
  PRESIDENT: "Présidents historiques",
  COACH: "Entraîneurs historiques",
  PLAYER: "Grandes figures",
  TEAM: "Grandes équipes",
};

const FIGURE_CATEGORY_ORDER = ["PRESIDENT", "COACH", "PLAYER", "TEAM"];

export default async function HistoirePage() {
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
            Histoire du club
          </h1>
          {foundedYear && <div className={styles.founded}>Fondé en {foundedYear}</div>}

          {history?.storyFr ? (
            <div className={styles.story}>{history.storyFr}</div>
          ) : (
            <p className={shared.empty}>Le récit de l&apos;histoire du club sera bientôt disponible.</p>
          )}

          {honors.length > 0 && (
            <>
              <h2 className={shared.sectionTitle} style={{ fontSize: 24, marginBottom: 20 }}>
                Palmarès
              </h2>
              <div className={styles.honorsGrid}>
                {honors.map((honor) => (
                  <div key={honor.id} className={`${shared.card} ${styles.honorCard}`}>
                    {honor.icon && <div className={styles.honorIcon}>{honor.icon}</div>}
                    <div className={styles.honorCompetition}>{honor.competitionFr}</div>
                    <div className={styles.honorCount}>{honor.titleCount} titre{honor.titleCount > 1 ? "s" : ""}</div>
                    {honor.yearsFr && <div className={styles.honorYears}>{honor.yearsFr}</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {figures.length > 0 &&
            FIGURE_CATEGORY_ORDER.filter((category) => figures.some((f) => f.category === category)).map((category) => (
              <div key={category} className={styles.figuresGroup}>
                <div className={styles.figuresGroupTitle}>{FIGURE_CATEGORY_LABELS[category]}</div>
                <div className={styles.figuresGrid}>
                  {figures
                    .filter((f) => f.category === category)
                    .map((figure) => (
                      <div key={figure.id} className={`${shared.card} ${styles.figureCard}`}>
                        <div className={styles.figureName}>{figure.nameFr}</div>
                        {figure.periodFr && <div className={styles.figurePeriod}>{figure.periodFr}</div>}
                        {figure.descriptionFr && <div className={styles.figureDescription}>{figure.descriptionFr}</div>}
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
