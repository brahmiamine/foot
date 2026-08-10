import type { Match } from "@/entities/Match";
import { formatShortDate } from "@/lib/format";
import shared from "./shared.module.css";
import styles from "./RecentResults.module.css";

function resultFor(match: Match, obTeamId: string): { label: string; className: string } {
  const isHome = match.equipeHome === obTeamId;
  const obScore = isHome ? match.scoreHome! : match.scoreAway!;
  const oppScore = isHome ? match.scoreAway! : match.scoreHome!;

  if (obScore > oppScore) return { label: "Victoire", className: styles.win };
  if (obScore < oppScore) return { label: "Défaite", className: styles.loss };
  return { label: "Nul", className: styles.draw };
}

export function RecentResults({ results, obTeamId }: { results: Match[]; obTeamId: string }) {
  return (
    <div className={shared.sectionPad}>
      <div className={shared.container}>
        <div className={shared.sectionHeader}>
          <h2 className={shared.sectionTitle}>Résultats récents</h2>
          <div className={shared.sectionSubtitle}>Ligue Professionnelle 1</div>
        </div>

        {results.length === 0 ? (
          <p className={shared.empty}>Aucun résultat publié pour le moment.</p>
        ) : (
          <div className={`ob-scroll ${styles.scroller}`}>
            {results.map((match) => {
              const result = resultFor(match, obTeamId);
              return (
                <div key={match.id} className={`${shared.card} ${styles.card}`}>
                  {match.date && <div className={styles.date}>{formatShortDate(match.date)}</div>}
                  <div className={styles.team}>{match.homeTeam?.nom}</div>
                  <div className={styles.score}>
                    {match.scoreHome} - {match.scoreAway}
                  </div>
                  <div className={styles.team}>{match.awayTeam?.nom}</div>
                  <div className={`${styles.badge} ${result.className}`}>{result.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
