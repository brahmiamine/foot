import Link from "next/link";
import type { Match } from "@/entities/Match";
import type { Stadium } from "@/entities/Stadium";
import { formatMatchDateTime } from "@/lib/format";
import { Reveal } from "./Reveal";
import styles from "./NextMatchBar.module.css";

export function NextMatchBar({
  match,
  obTeamId,
  homeStadium,
}: {
  match: Match | null;
  obTeamId: string;
  homeStadium: Stadium | null;
}) {
  const isHome = match?.equipeHome === obTeamId;
  const location = match
    ? isHome
      ? [homeStadium?.nameFr, homeStadium?.cityFr].filter(Boolean).join(", ") || "Domicile"
      : [match.awayTeam?.stadium, match.awayTeam?.city].filter(Boolean).join(", ") || "À l'extérieur"
    : null;

  return (
    <div id="calendrier" className={styles.bar}>
      <Reveal variant="up" className={styles.inner}>
        <div className={styles.label}>Prochain match · Ligue Professionnelle 1</div>

        {match ? (
          <>
            <div className={styles.teams}>
              <div className={styles.teamName}>{match.homeTeam?.nom}</div>
              <div className={styles.vs}>vs</div>
              <div className={styles.teamName}>{match.awayTeam?.nom}</div>
            </div>
            <div className={styles.meta}>
              <div className={styles.when}>
                {match.date && <div className={styles.datetime}>{formatMatchDateTime(match.date)}</div>}
                {location && <div className={styles.location}>{location}</div>}
              </div>
              <Link href="/billetterie" className={styles.cta}>
                Billets
              </Link>
            </div>
          </>
        ) : (
          <div className={styles.location}>Aucun match à venir programmé pour le moment.</div>
        )}
      </Reveal>
    </div>
  );
}
