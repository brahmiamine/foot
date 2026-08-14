import type { Match } from "@/entities/Match";
import type { Stadium } from "@/entities/Stadium";
import { formatMatchDateTime } from "@/lib/format";
import { Reveal } from "./Reveal";
import styles from "./NextMatchBar.module.css";
import { getTranslator } from "@/i18n/server";
import { localized } from "@/i18n/localized";

export async function NextMatchBar({
  match,
  obTeamId,
  homeStadium,
}: {
  match: Match | null;
  obTeamId: string;
  homeStadium: Stadium | null;
}) {
  const { locale, t } = await getTranslator();
  const isHome = match?.equipeHome === obTeamId;
  const location = match
    ? isHome
      ? [localized(locale, homeStadium?.nameFr, homeStadium?.nameAr), localized(locale, homeStadium?.cityFr, homeStadium?.cityAr)].filter(Boolean).join(", ") || t("common.home")
      : [match.awayTeam?.stadium, match.awayTeam?.city].filter(Boolean).join(", ") || t("common.away")
    : null;

  return (
    <div id="calendrier" className={styles.bar}>
      <Reveal variant="up" className={styles.inner}>
        <div className={styles.label}>{t("home.nextMatch")}</div>

        {match ? (
          <>
            <div className={styles.teams}>
              <div className={styles.teamName}>{match.homeTeam && localized(locale, match.homeTeam.nom, match.homeTeam.nomAr)}</div>
              <div className={styles.vs}>{t("common.vs")}</div>
              <div className={styles.teamName}>{match.awayTeam && localized(locale, match.awayTeam.nom, match.awayTeam.nomAr)}</div>
            </div>
            <div className={styles.meta}>
              <div className={styles.when}>
                {match.date && <div className={styles.datetime}>{formatMatchDateTime(match.date, locale)}</div>}
                {location && <div className={styles.location}>{location}</div>}
              </div>
              <a href="#ticketing" className={styles.cta}>
                {t("common.tickets")}
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
