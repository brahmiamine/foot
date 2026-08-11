import { PageChrome } from "@/components/PageChrome";
import { PredictionWidget } from "@/components/PredictionWidget";
import { getObTeam } from "@/lib/ob-team";
import { PublicMatchService } from "@/services/PublicMatchService";
import { PredictionService } from "@/services/PredictionService";
import { getSessionMember } from "@/lib/community/member";
import { scorePendingPredictionsForTeam } from "@/lib/community/predictions";
import { formatFullDateTime, formatShortDate } from "@/lib/format";
import type { Match } from "@/entities/Match";
import type { ObPrediction } from "@/entities/ObPrediction";
import shared from "@/components/shared.module.css";
import styles from "./pronostics.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pronostics — Olympique de Béja",
};

function opponentLabel(match: Match, obTeamId: string): string {
  const isHome = match.equipeHome === obTeamId;
  return (isHome ? match.awayTeam?.nom : match.homeTeam?.nom) ?? "Adversaire";
}

export default async function PronosticsPage() {
  const team = await getObTeam();
  const sessionMember = await getSessionMember();

  if (!team) {
    return (
      <PageChrome>
        <div className={shared.sectionPad}>
          <div className={shared.container}>
            <p className={shared.empty}>Club non configuré.</p>
          </div>
        </div>
      </PageChrome>
    );
  }

  await scorePendingPredictionsForTeam(team.id);

  const matches = await new PublicMatchService().getAllPublic(team.id);
  const upcoming = matches
    .filter((m) => m.status === "UPCOMING")
    .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
  const finished = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    .slice(0, 10);

  const allIds = [...upcoming, ...finished].map((m) => m.id);
  const myPredictions: Map<string, ObPrediction> = sessionMember
    ? await new PredictionService().getForUserByMatch(sessionMember.session.id, allIds)
    : new Map();

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
            Pronostics
          </h1>

          {upcoming.length === 0 ? (
            <p className={shared.empty}>Aucun match à pronostiquer pour le moment.</p>
          ) : (
            <div className={styles.group}>
              {upcoming.map((match) => {
                const prediction = myPredictions.get(match.id);
                return (
                  <div key={match.id}>
                    <p className={styles.matchDate}>{match.date ? formatFullDateTime(match.date) : "Date à confirmer"}</p>
                    <PredictionWidget
                      matchId={match.id}
                      homeLabel={team.nom}
                      awayLabel={opponentLabel(match, team.id)}
                      initialScoreHome={prediction?.scoreHome ?? null}
                      initialScoreAway={prediction?.scoreAway ?? null}
                      loggedIn={!!sessionMember}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {sessionMember && finished.length > 0 && (
            <>
              <h2 className={shared.sectionSubtitle}>Vos derniers pronostics</h2>
              <div className={styles.history}>
                {finished
                  .filter((m) => myPredictions.has(m.id))
                  .map((match) => {
                    const prediction = myPredictions.get(match.id)!;
                    const exact = prediction.pointsAwarded != null && prediction.pointsAwarded > 0;
                    return (
                      <div key={match.id} className={`${shared.card} ${styles.historyRow}`}>
                        <div>
                          <div className={styles.teams}>
                            {match.homeTeam?.nom} vs {match.awayTeam?.nom}
                          </div>
                          {match.date && <div className={styles.matchDate}>{formatShortDate(match.date)}</div>}
                        </div>
                        <div className={styles.result}>
                          <span>
                            Votre pronostic : {prediction.scoreHome} - {prediction.scoreAway}
                          </span>
                          <span>
                            Score final : {match.scoreHome} - {match.scoreAway}
                          </span>
                          {prediction.pointsAwarded == null ? (
                            <span className={styles.pending}>En attente du résultat</span>
                          ) : exact ? (
                            <span className={styles.win}>🎉 Bon pronostic ! +{prediction.pointsAwarded} points</span>
                          ) : (
                            <span className={styles.miss}>Pas de bonus cette fois</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
