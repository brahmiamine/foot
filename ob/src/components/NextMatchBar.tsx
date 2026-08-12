import type { Match } from "@/entities/Match";
import type { Stadium } from "@/entities/Stadium";
import { formatMatchDateTime } from "@/lib/format";
import { Reveal } from "./Reveal";
import styles from "./NextMatchBar.module.css";
import { getTranslator } from "@/i18n/server";

export async function NextMatchBar({
  match,
  obTeamId,
  homeStadium,
}: {
  match: Match | null;
  obTeamId: string;
  homeStadium: Stadium | null;
}) {
  const { t } = await getTranslator();
  const isHome = match?.equipeHome === obTeamId;
  const location = match
    ? isHome
      ? [homeStadium?.nameFr, homeStadium?.cityFr].filter(Boolean).join(", ") || t("common.home")
      : [match.awayTeam?.stadium, match.awayTeam?.city].filter(Boolean).join(", ") || t("common.away")
    : null;

  return (
    <div id="calendrier" className={styles.bar}>
      <Reveal variant="up" className={styles.inner}>
        <div className={styles.label}>{t("home.nextMatch")}</div>

        {match ? (
          <>
            <div className={styles.teams}>
              <div className={styles.teamName}>{match.homeTeam?.nom}</div>
              <div className={styles.vs}>{t("common.vs")}</div>
              <div className={styles.teamName}>{match.awayTeam?.nom}</div>
            </div>
            <div className={styles.meta}>
              <div className={styles.when}>
                {match.date && <div className={styles.datetime}>{formatMatchDateTime(match.date)}</div>}
                {location && <div className={styles.location}>{location}</div>}
              </div>
              <a href="#billetterie" className={styles.cta}>
                Billets
              </a>
            </div>
          </>
        ) : (
          <div className={styles.location}>{t("home.noUpcomingMatch")}</div>
        )}
      </Reveal>
    </div>
  );
}
