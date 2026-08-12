import type { StandingsRow } from "@/services/PublicStandingsService";
import shared from "./shared.module.css";
import { getTranslator } from "@/i18n/server";
import styles from "./StandingsSection.module.css";

function formatDiff(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

export async function StandingsSection({
  standings,
  obTeamId,
  federationName,
}: {
  standings: StandingsRow[];
  obTeamId: string;
  federationName?: string | null;
}) {
  const { t } = await getTranslator();
  return (
    <div id="classement" className={`${styles.section} ${shared.sectionPad}`}>
      <div className={shared.container}>
        <div className={shared.sectionHeader}>
          <h2 className={shared.sectionTitle}>{t("nav.standings")}</h2>
          {federationName && <div className={shared.sectionSubtitle}>{federationName}</div>}
        </div>

        {standings.length === 0 ? (
          <p className={shared.empty}>
            {t("standings.empty")}
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("standings.team")}</th>
                  <th className={styles.center}>{t("standings.played")}</th>
                  <th className={styles.center}>{t("standings.won")}</th>
                  <th className={styles.center}>{t("standings.drawn")}</th>
                  <th className={styles.center}>{t("standings.lost")}</th>
                  <th className={styles.center}>+/-</th>
                  <th className={styles.center}>{t("standings.points")}</th>
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
