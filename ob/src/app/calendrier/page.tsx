import { getLocalizedMetadata, getTranslator } from "@/i18n/server";
import type { Match } from "@/entities/Match";
import { getObTeam } from "@/lib/ob-team";
import { PublicMatchService } from "@/services/PublicMatchService";
import { matchOutcomeForTeam } from "@/lib/match";
import { formatFullDateTime, formatShortDate } from "@/lib/format";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./calendrier.module.css";
import { localized } from "@/i18n/localized";

export const dynamic = "force-dynamic";

export const generateMetadata = () => getLocalizedMetadata("metadata.calendar");

const OUTCOME_CLASSES: Record<ReturnType<typeof matchOutcomeForTeam>, string> = {
  WIN: styles.win,
  LOSS: styles.loss,
  DRAW: styles.draw,
};

function opponentLine(match: Match, obTeamId: string, locale: "fr" | "ar"): string {
  const home = match.homeTeam ? localized(locale, match.homeTeam.nom, match.homeTeam.nomAr) : "";
  const away = match.awayTeam ? localized(locale, match.awayTeam.nom, match.awayTeam.nomAr) : "";
  return `${home} - ${away}`;
}

export default async function CalendrierPage() {
  const { locale, t } = await getTranslator();
  const team = await getObTeam();
  const matches = team ? await new PublicMatchService().getAllPublic(team.id) : [];

  const upcoming = matches.filter((m) => m.status === "UPCOMING" || m.status === "IN_PROGRESS");
  const finished = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
            {t("calendar.title")}
          </h1>

          {matches.length === 0 ? (
            <p className={shared.empty}>{t("calendar.empty")}</p>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div className={styles.group}>
                  <div className={styles.groupLabel}>{t("calendar.upcoming")}</div>
                  <div className={styles.list}>
                    {upcoming.map((match) => (
                      <div key={match.id} className={`${shared.card} ${styles.row}`}>
                        <div className={styles.teams}>{team ? opponentLine(match, team.id, locale) : ""}</div>
                        <div className={styles.date}>{match.date ? formatFullDateTime(match.date, locale) : t("common.dateTbc")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {finished.length > 0 && (
                <div className={styles.group}>
                  <div className={styles.groupLabel}>{t("calendar.results")}</div>
                  <div className={styles.list}>
                    {finished.map((match) => {
                      const outcome = team ? matchOutcomeForTeam(match, team.id) : null;
                      return (
                        <div key={match.id} className={`${shared.card} ${styles.row}`}>
                          <div>
                            <div className={styles.teams}>
                              {match.homeTeam && localized(locale, match.homeTeam.nom, match.homeTeam.nomAr)} {t("common.vs")} {match.awayTeam && localized(locale, match.awayTeam.nom, match.awayTeam.nomAr)}
                            </div>
                            {match.date && <div className={styles.date}>{formatShortDate(match.date, locale)}</div>}
                          </div>
                          <div className={styles.meta}>
                            <div className={styles.score}>
                              {match.scoreHome} - {match.scoreAway}
                            </div>
                            {outcome && (
                              <div className={`${styles.badge} ${OUTCOME_CLASSES[outcome]}`}>{t(`match.${outcome.toLowerCase()}` as "match.win" | "match.loss" | "match.draw")}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
