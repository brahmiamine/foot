import shared from "./shared.module.css";
import styles from "./HistorySection.module.css";
import { getTranslator } from "@/i18n/server";
import type { TranslationKey } from "@/i18n/dictionaries";

/**
 * Contenu éditorial statique : il n'existe pas (encore) de table "histoire
 * du club" dans le schéma partagé, contrairement aux matchs/joueurs/actus.
 * Repris tel quel des faits publics vérifiés lors de la conception du
 * design (fondation, palmarès) — à faire évoluer en dur ici tant qu'aucune
 * table CMS dédiée n'existe.
 */
const TIMELINE: { year: string; key: TranslationKey }[] = ["1929", "1985", "1993", "1995", "2010", "2023"].map(
  (year) => ({ year, key: `history.${year}` as TranslationKey }),
);

export async function HistorySection() {
  const { t } = await getTranslator();
  return (
    <div id="histoire" className={shared.sectionPad}>
      <div className={shared.container}>
        <h2 className={shared.sectionTitle} style={{ marginBottom: 36 }}>
          {t("history.title")}
        </h2>
        <div className={styles.list}>
          {TIMELINE.map((entry) => (
            <div key={entry.year} className={styles.row}>
              <div className={styles.year}>{entry.year}</div>
              <div className={styles.text}>{t(entry.key)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
