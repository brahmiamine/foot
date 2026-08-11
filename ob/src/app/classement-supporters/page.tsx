import { PageChrome } from "@/components/PageChrome";
import { LeaderboardService } from "@/services/LeaderboardService";
import shared from "@/components/shared.module.css";
import styles from "./classement.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Classement des supporters — Olympique de Béja",
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function ClassementSupportersPage() {
  const service = new LeaderboardService();
  const [top, fanOfTheMonth, fanOfTheSeason] = await Promise.all([
    service.getTopSupporters(50),
    service.getFanOfTheMonth(),
    service.getFanOfTheSeason(),
  ]);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            🏆 Classement des supporters
          </h1>
          <p className={styles.subtitle}>Le classement des supporters les plus actifs de l&apos;Olympique de Béja.</p>

          <div className={styles.highlights}>
            {fanOfTheMonth && (
              <div className={`${shared.card} ${styles.highlight}`}>
                <div className={styles.highlightLabel}>Fan du mois</div>
                <div className={styles.highlightName}>{fanOfTheMonth.name}</div>
              </div>
            )}
            {fanOfTheSeason && (
              <div className={`${shared.card} ${styles.highlight}`}>
                <div className={styles.highlightLabel}>Fan de la saison</div>
                <div className={styles.highlightName}>{fanOfTheSeason.name}</div>
              </div>
            )}
          </div>

          {top.length === 0 ? (
            <p className={shared.empty}>Aucun supporter classé pour le moment.</p>
          ) : (
            <div className={styles.list}>
              {top.map((row, index) => (
                <div key={row.userId} className={`${shared.card} ${styles.row}`}>
                  <span className={styles.rank}>{MEDALS[index] ?? `#${index + 1}`}</span>
                  <span className={styles.name}>{row.name}</span>
                  <span className={styles.points}>{row.points.toLocaleString("fr-FR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
