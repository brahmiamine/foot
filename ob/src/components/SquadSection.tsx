import type { SquadGroup } from "@/services/PublicPlayerService";
import { calcAge } from "@/lib/format";
import shared from "./shared.module.css";
import { getTranslator } from "@/i18n/server";
import styles from "./SquadSection.module.css";
import { localized } from "@/i18n/localized";

export async function SquadSection({ groups }: { groups: SquadGroup[] }) {
  const { locale, t } = await getTranslator();
  const groupKeys = { Gardiens: "squad.goalkeepers", Défenseurs: "squad.defenders", Milieux: "squad.midfielders", Attaquants: "squad.forwards", Autres: "squad.others" } as const;
  return (
    <div id="effectif" className={shared.sectionPad}>
      <div className={shared.container}>
        <h2 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
          {t("nav.squad")}
        </h2>

        {groups.length === 0 ? (
          <p className={shared.empty}>{t("squad.empty")}</p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupLabel}>{group.label in groupKeys ? t(groupKeys[group.label as keyof typeof groupKeys]) : group.label}</div>
              <div className={styles.grid}>
                {group.players.map((player) => (
                  <div key={player.id} className={`${shared.card} ${styles.player}`}>
                    <div className={styles.number}>{player.number}</div>
                    <div className={styles.name}>
                      {localized(locale, player.firstNameFr, player.firstNameAr)} {localized(locale, player.lastNameFr, player.lastNameAr)}
                    </div>
                    <div className={styles.sub}>{player.birthDate ? t("squad.age", { age: calcAge(player.birthDate) }) : ""}</div>
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
