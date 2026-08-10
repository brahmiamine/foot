import type { SquadGroup } from "@/services/PublicPlayerService";
import { calcAge } from "@/lib/format";
import shared from "./shared.module.css";
import styles from "./SquadSection.module.css";

export function SquadSection({ groups }: { groups: SquadGroup[] }) {
  return (
    <div id="effectif" className={shared.sectionPad}>
      <div className={shared.container}>
        <h2 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
          Effectif
        </h2>

        {groups.length === 0 ? (
          <p className={shared.empty}>Effectif non publié pour le moment.</p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupLabel}>{group.label}</div>
              <div className={styles.grid}>
                {group.players.map((player) => (
                  <div key={player.id} className={`${shared.card} ${styles.player}`}>
                    <div className={styles.number}>{player.number}</div>
                    <div className={styles.name}>
                      {player.firstNameFr} {player.lastNameFr}
                    </div>
                    <div className={styles.sub}>{player.birthDate ? `${calcAge(player.birthDate)} ans` : ""}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
