import { PageChrome } from "@/components/PageChrome";
import { LeaderboardService } from "@/services/LeaderboardService";
import shared from "@/components/shared.module.css";
import styles from "./hall-of-fame.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hall of Fame OB — Olympique de Béja",
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function HallOfFamePage() {
  const service = new LeaderboardService();
  const years = await service.getAvailableYears();

  const [yearlyResults, topPredictors, topContributors, oldestMembers] = await Promise.all([
    Promise.all(years.map(async (year) => ({ year, supporters: await service.getSupportersOfYear(year) }))),
    service.getTopPredictors(1),
    service.getTopContributors(1),
    service.getOldestMembers(1),
  ]);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            👑 Hall of Fame OB
          </h1>
          <p className={styles.subtitle}>Les supporters qui ont marqué l&apos;histoire de l&apos;espace OB.</p>

          <div className={styles.categories}>
            {oldestMembers[0] && (
              <div className={`${shared.card} ${styles.category}`}>
                <div className={styles.categoryLabel}>Supporter historique</div>
                <div className={styles.categoryName}>{oldestMembers[0].name}</div>
              </div>
            )}
            {topPredictors[0] && topPredictors[0].exactCount > 0 && (
              <div className={`${shared.card} ${styles.category}`}>
                <div className={styles.categoryLabel}>Meilleur pronostiqueur</div>
                <div className={styles.categoryName}>{topPredictors[0].name}</div>
                <div className={styles.categoryMeta}>{topPredictors[0].exactCount} pronostics exacts</div>
              </div>
            )}
            {topContributors[0] && topContributors[0].contributions > 0 && (
              <div className={`${shared.card} ${styles.category}`}>
                <div className={styles.categoryLabel}>Meilleur contributeur</div>
                <div className={styles.categoryName}>{topContributors[0].name}</div>
                <div className={styles.categoryMeta}>{topContributors[0].contributions} contributions</div>
              </div>
            )}
          </div>

          <h2 className={shared.sectionSubtitle}>Supporters de l&apos;année</h2>
          {yearlyResults.length === 0 ? (
            <p className={shared.empty}>Pas encore de classement annuel.</p>
          ) : (
            yearlyResults.map(({ year, supporters }) => (
              <div key={year} className={styles.yearBlock}>
                <div className={styles.year}>{year}</div>
                <div className={styles.podium}>
                  {supporters.map((s, i) => (
                    <div key={s.userId} className={`${shared.card} ${styles.podiumRow}`}>
                      <span>{MEDALS[i] ?? `#${i + 1}`}</span>
                      <span className={styles.podiumName}>{s.name}</span>
                      <span className={styles.podiumPoints}>{s.points.toLocaleString("fr-FR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageChrome>
  );
}
