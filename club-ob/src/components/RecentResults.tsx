import Link from "next/link";
import type { Match } from "@/entities/Match";
import { formatShortDate } from "@/lib/format";
import { matchOutcomeForTeam } from "@/lib/match";
import shared from "./shared.module.css";
import { getTranslator } from "@/i18n/server";
import { localized } from "@/i18n/localized";
import styles from "./RecentResults.module.css";

const OUTCOME_CLASSES: Record<ReturnType<typeof matchOutcomeForTeam>, string> = {
  WIN: styles.win,
  LOSS: styles.loss,
  DRAW: styles.draw,
};

export async function RecentResults({ results, obTeamId }: { results: Match[]; obTeamId: string }) {
  const { locale, t } = await getTranslator();
  return (
    <div className={shared.sectionPad}>
      <div className={shared.container}>
        <div className={shared.sectionHeader}>
          <h2 className={shared.sectionTitle}>{t("home.recentResults")}</h2>
          <div className={shared.sectionSubtitle}>{t("home.league")}</div>
        </div>

        {results.length === 0 ? (
          <p className={shared.empty}>{t("home.noResults")}</p>
        ) : (
          <div className={`ob-scroll ${styles.scroller}`}>
            {results.map((match) => {
              const outcome = matchOutcomeForTeam(match, obTeamId);
              return (
                <div key={match.id} className={`${shared.card} ${styles.card}`}>
                  {match.date && <div className={styles.date}>{formatShortDate(match.date, locale)}</div>}
                  <div className={styles.team}>{match.homeTeam && localized(locale, match.homeTeam.nom, match.homeTeam.nomAr)}</div>
                  <div className={styles.score}>
                    {match.scoreHome} - {match.scoreAway}
                  </div>
                  <div className={styles.team}>{match.awayTeam && localized(locale, match.awayTeam.nom, match.awayTeam.nomAr)}</div>
                  <div className={`${styles.badge} ${OUTCOME_CLASSES[outcome]}`}>{t(`match.${outcome.toLowerCase()}` as "match.win" | "match.loss" | "match.draw")}</div>
                </div>
              );
            })}
          </div>
        )}

        <Link href="/calendrier" className={shared.sectionSubtitle} style={{ display: "inline-block", marginTop: 20 }}>
          {t("home.fullCalendar")}
        </Link>
      </div>
    </div>
  );
}
