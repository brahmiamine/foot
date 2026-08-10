import type { StandingsRow } from "@/services/PublicStandingsService";
import shared from "./shared.module.css";
import styles from "./StandingsSection.module.css";

function formatDiff(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

export function StandingsSection({
  standings,
  obTeamId,
  federationName,
}: {
  standings: StandingsRow[];
  obTeamId: string;
  federationName?: string | null;
}) {
  return (
    <div id="classement" className={`${styles.section} ${shared.sectionPad}`}>
      <div className={shared.container}>
        <div className={shared.sectionHeader}>
          <h2 className={shared.sectionTitle}>Classement</h2>
          {federationName && <div className={shared.sectionSubtitle}>{federationName}</div>}
        </div>

        {standings.length === 0 ? (
          <p className={shared.empty}>
            Classement indisponible pour le moment : il est calculé à partir des matchs enregistrés dans le club.
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Équipe</th>
                  <th className={styles.center}>J</th>
                  <th className={styles.center}>V</th>
                  <th className={styles.center}>N</th>
                  <th className={styles.center}>D</th>
                  <th className={styles.center}>+/-</th>
                  <th className={styles.center}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, index) => (
                  <tr key={row.teamId} className={row.teamId === obTeamId ? styles.highlight : undefined}>
                    <td className={styles.pos}>{index + 1}</td>
                    <td className={styles.team}>{row.team}</td>
                    <td className={styles.center}>{row.played}</td>
                    <td className={styles.center}>{row.won}</td>
                    <td className={styles.center}>{row.drawn}</td>
                    <td className={styles.center}>{row.lost}</td>
                    <td className={styles.center}>{formatDiff(row.goalDiff)}</td>
                    <td className={styles.pts}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
