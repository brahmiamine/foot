import { getObTeam } from "@/lib/ob-team";
import { PlayerStatsService } from "@/services/PlayerStatsService";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./statistiques.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Statistiques — Olympique de Béja",
};

export default async function StatistiquesPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
  const { saison } = await searchParams;
  const team = await getObTeam();

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

  const service = new PlayerStatsService();
  const seasons = await service.listSeasons(team.id);
  const selectedSeason = saison && seasons.includes(saison) ? saison : seasons[0];
  const rows = selectedSeason ? await service.getSeasonStats(team.id, selectedSeason) : [];

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            📊 Statistiques
          </h1>

          {seasons.length > 1 && (
            <div className={styles.seasonTabs}>
              {seasons.map((s) => (
                <a key={s} href={`/statistiques?saison=${encodeURIComponent(s)}`} className={s === selectedSeason ? styles.active : ""}>
                  {s}
                </a>
              ))}
            </div>
          )}

          {rows.length === 0 ? (
            <p className={shared.empty}>Aucune statistique publiée pour le moment.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Joueur</th>
                    <th>Apparitions</th>
                    <th>Buts</th>
                    <th>Passes</th>
                    <th>Minutes</th>
                    <th>🟨</th>
                    <th>🟥</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.playerId}>
                      <td>{row.playerName}</td>
                      <td>{row.appearances}</td>
                      <td>{row.goals}</td>
                      <td>{row.assists}</td>
                      <td>{row.minutesPlayed}</td>
                      <td>{row.yellowCards}</td>
                      <td>{row.redCards}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
