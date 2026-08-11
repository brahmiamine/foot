import type { Match } from "@/entities/Match";
import { getObTeam } from "@/lib/ob-team";
import { PublicMatchService } from "@/services/PublicMatchService";
import { MatchStatsService } from "@/services/MatchStatsService";
import { getDataSource } from "@/lib/database";
import { MatchCard } from "@/entities/MatchCard";
import { matchOutcomeForTeam, OUTCOME_LABELS } from "@/lib/match";
import { formatFullDateTime, formatShortDate } from "@/lib/format";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./calendrier.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendrier — Olympique de Béja",
};

const OUTCOME_CLASSES: Record<ReturnType<typeof matchOutcomeForTeam>, string> = {
  WIN: styles.win,
  LOSS: styles.loss,
  DRAW: styles.draw,
};

function opponentLine(match: Match, obTeamId: string): string {
  const isHome = match.equipeHome === obTeamId;
  const opponent = isHome ? match.awayTeam?.nom : match.homeTeam?.nom;
  return isHome ? `${match.homeTeam?.nom} vs ${opponent}` : `${opponent} vs ${match.awayTeam?.nom}`;
}

async function getCardCounts(matchIds: string[]): Promise<Map<string, number>> {
  if (matchIds.length === 0) return new Map();
  const dataSource = await getDataSource();
  const rows = await dataSource
    .getRepository(MatchCard)
    .createQueryBuilder("c")
    .select("c.matchId", "matchId")
    .addSelect("COUNT(*)", "count")
    .where("c.matchId IN (:...matchIds)", { matchIds })
    .andWhere("c.isNeutralized = false")
    .groupBy("c.matchId")
    .getRawMany<{ matchId: string; count: string }>();
  return new Map(rows.map((r) => [r.matchId, Number(r.count)]));
}

export default async function CalendrierPage() {
  const team = await getObTeam();
  const matches = team ? await new PublicMatchService().getAllPublic(team.id) : [];

  const upcoming = matches.filter((m) => m.status === "UPCOMING" || m.status === "IN_PROGRESS");
  const finished = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  const finishedIds = finished.map((m) => m.id);
  const statsByMatch = await new MatchStatsService().getForMatches(finishedIds);
  const cardCountByMatch = await getCardCounts(finishedIds);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
            Calendrier
          </h1>

          {matches.length === 0 ? (
            <p className={shared.empty}>Calendrier non publié pour le moment.</p>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div className={styles.group}>
                  <div className={styles.groupLabel}>À venir</div>
                  <div className={styles.list}>
                    {upcoming.map((match) => (
                      <div key={match.id} className={`${shared.card} ${styles.row}`}>
                        <div className={styles.teams}>{team ? opponentLine(match, team.id) : ""}</div>
                        <div className={styles.date}>{match.date ? formatFullDateTime(match.date) : "Date à confirmer"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {finished.length > 0 && (
                <div className={styles.group}>
                  <div className={styles.groupLabel}>Résultats</div>
                  <div className={styles.list}>
                    {finished.map((match) => {
                      const outcome = team ? matchOutcomeForTeam(match, team.id) : null;
                      const stats = statsByMatch.get(match.id);
                      const cards = cardCountByMatch.get(match.id);
                      return (
                        <div key={match.id} className={`${shared.card} ${styles.row}`}>
                          <div style={{ width: "100%" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                              <div>
                                <div className={styles.teams}>
                                  {match.homeTeam?.nom} vs {match.awayTeam?.nom}
                                </div>
                                {match.date && <div className={styles.date}>{formatShortDate(match.date)}</div>}
                              </div>
                              <div className={styles.meta}>
                                <div className={styles.score}>
                                  {match.scoreHome} - {match.scoreAway}
                                </div>
                                {outcome && (
                                  <div className={`${styles.badge} ${OUTCOME_CLASSES[outcome]}`}>{OUTCOME_LABELS[outcome]}</div>
                                )}
                              </div>
                            </div>
                            {(stats || cards) && (
                              <div className={styles.stats}>
                                <div className={styles.statsLabel}>Statistiques</div>
                                {stats?.possessionHome != null && (
                                  <div>
                                    Possession {stats.possessionHome}% - {stats.possessionAway}%
                                  </div>
                                )}
                                {stats?.shotsHome != null && (
                                  <div>
                                    Tirs {stats.shotsHome} - {stats.shotsAway}
                                  </div>
                                )}
                                {stats?.shotsOnTargetHome != null && (
                                  <div>
                                    Tirs cadrés {stats.shotsOnTargetHome} - {stats.shotsOnTargetAway}
                                  </div>
                                )}
                                {stats?.cornersHome != null && (
                                  <div>
                                    Corners {stats.cornersHome} - {stats.cornersAway}
                                  </div>
                                )}
                                {stats?.foulsHome != null && (
                                  <div>
                                    Fautes {stats.foulsHome} - {stats.foulsAway}
                                  </div>
                                )}
                                {cards != null && <div>Cartons {cards}</div>}
                              </div>
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
