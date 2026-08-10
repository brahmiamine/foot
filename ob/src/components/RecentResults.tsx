import Link from "next/link";
import type { Match } from "@/entities/Match";
import { formatShortDate } from "@/lib/format";
import { matchOutcomeForTeam, OUTCOME_LABELS } from "@/lib/match";
import shared from "./shared.module.css";
import styles from "./RecentResults.module.css";

const OUTCOME_CLASSES: Record<ReturnType<typeof matchOutcomeForTeam>, string> = {
  WIN: styles.win,
  LOSS: styles.loss,
  DRAW: styles.draw,
};

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
              const outcome = matchOutcomeForTeam(match, obTeamId);
              return (
                <div key={match.id} className={`${shared.card} ${styles.card}`}>
                  {match.date && <div className={styles.date}>{formatShortDate(match.date)}</div>}
                  <div className={styles.team}>{match.homeTeam?.nom}</div>
                  <div className={styles.score}>
                    {match.scoreHome} - {match.scoreAway}
                  </div>
                  <div className={styles.team}>{match.awayTeam?.nom}</div>
                  <div className={`${styles.badge} ${OUTCOME_CLASSES[outcome]}`}>{OUTCOME_LABELS[outcome]}</div>
                </div>
              );
            })}
          </div>
        )}

        <Link href="/calendrier" className={shared.sectionSubtitle} style={{ display: "inline-block", marginTop: 20 }}>
          Voir le calendrier complet →
        </Link>
      </div>
    </div>
  );
}
